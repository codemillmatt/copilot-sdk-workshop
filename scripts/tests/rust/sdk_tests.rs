use github_copilot_sdk::types::SessionConfig;
use github_copilot_sdk::{Client, ClientOptions, Transport};
use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Read, Write};
use std::net::TcpListener;
use std::sync::mpsc::{Receiver, channel};
use std::thread::JoinHandle;
use std::time::Duration;

// The fixture is loopback-only JSON-RPC, with no CLI, model, or MCP process.
pub(super) async fn fake_sdk(mode: &'static str) -> (Client, Receiver<Value>, JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let (sender, receiver) = channel();
    let worker = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(10)))
            .unwrap();
        stream
            .set_write_timeout(Some(Duration::from_secs(10)))
            .unwrap();
        let mut reader = BufReader::new(stream.try_clone().unwrap());
        let mut session_id = Value::Null;
        loop {
            let mut header = String::new();
            if reader.read_line(&mut header).unwrap() == 0 {
                break;
            }
            let length: usize = header
                .trim()
                .strip_prefix("Content-Length: ")
                .unwrap()
                .parse()
                .unwrap();
            let mut separator = String::new();
            reader.read_line(&mut separator).unwrap();
            assert_eq!(separator, "\r\n");
            let mut data = vec![0; length];
            reader.read_exact(&mut data).unwrap();
            let request: Value = serde_json::from_slice(&data).unwrap();
            let Some(id) = request.get("id") else {
                continue;
            };
            let method = request["method"].as_str().unwrap();
            let result = match method {
                "connect" => json!({"ok":true,"protocolVersion":3,"version":"fixture"}),
                "session.create" => {
                    sender.send(request["params"].clone()).unwrap();
                    session_id = request["params"]["sessionId"].clone();
                    json!({"sessionId":session_id})
                }
                "session.send" if mode == "send-error" => {
                    write_frame(
                        &mut stream,
                        json!({"jsonrpc":"2.0","id":id,"error":{"code":-32000,"message":"fixture send failed"}}),
                    );
                    continue;
                }
                "session.send" => json!({"messageId":"fixture-message"}),
                _ => json!({}),
            };
            write_frame(
                &mut stream,
                json!({"jsonrpc":"2.0","id":id,"result":result}),
            );
            if method == "session.send" && mode != "timeout" {
                let event = match mode {
                    "message" => {
                        json!({"type":"assistant.message","data":{"content":"fixture response"}})
                    }
                    "session-error" => {
                        json!({"type":"session.error","data":{"message":"fixture session failed"}})
                    }
                    _ => {
                        json!({"type":"assistant.message_delta","data":{"deltaContent":"fixture response"}})
                    }
                };
                for mut event in [event, json!({"type":"session.idle","data":{}})] {
                    event["id"] = json!("fixture-event");
                    event["timestamp"] = json!("2026-01-01T00:00:00Z");
                    write_frame(
                        &mut stream,
                        json!({"jsonrpc":"2.0","method":"session.event","params":{"sessionId":session_id,"event":event}}),
                    );
                }
            }
        }
    });
    let options = ClientOptions::default().with_transport(Transport::External {
        host: address.ip().to_string(),
        port: address.port(),
        connection_token: None,
    });
    let client = Client::start(options).await.unwrap();
    (client, receiver, worker)
}

fn write_frame(stream: &mut std::net::TcpStream, value: Value) {
    let data = serde_json::to_vec(&value).unwrap();
    write!(stream, "Content-Length: {}\r\n\r\n", data.len()).unwrap();
    stream.write_all(&data).unwrap();
    stream.flush().unwrap();
}

#[tokio::test]
async fn pinned_sdk_empty_versus_unset() {
    let (client, requests, worker) = fake_sdk("timeout").await;
    for tools in [None, Some(vec![])] {
        let mut config = SessionConfig::default()
            .with_permission_handler(github_copilot_sdk::permission::deny_all());
        config.available_tools = tools.clone();
        let session = client.create_session(config).await.unwrap();
        let wire = requests.recv_timeout(Duration::from_secs(2)).unwrap();
        if tools.is_none() {
            assert!(wire.get("availableTools").is_none(), "{wire}");
        } else {
            assert_eq!(wire["availableTools"], json!([]));
        }
        assert_eq!(wire["requestPermission"], json!(true));
        session.disconnect().await.unwrap();
    }
    client.stop().await.unwrap();
    // SDK 1.0.11's graceful stop does not close an external transport.
    client.force_stop();
    drop(client);
    tokio::task::spawn_blocking(move || worker.join().unwrap())
        .await
        .unwrap();
}
