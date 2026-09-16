package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"strings"
	"testing"
	"time"

	copilot "github.com/github/copilot-sdk/go"
	"github.com/github/copilot-sdk/go/rpc"
)

// This local fixture speaks only JSON-RPC; it never starts a CLI, model, or MCP server.
func fakeSDK(t *testing.T, mode string) (*copilot.Client, <-chan map[string]any) {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	requests := make(chan map[string]any, 8)
	done := make(chan error, 1)
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			done <- err
			return
		}
		defer conn.Close()
		if err := conn.SetDeadline(time.Now().Add(10 * time.Second)); err != nil {
			done <- err
			return
		}
		reader := bufio.NewReader(conn)
		sessionID := ""
		write := func(value any) error {
			data, err := json.Marshal(value)
			if err != nil {
				return err
			}
			_, err = fmt.Fprintf(conn, "Content-Length: %d\r\n\r\n%s", len(data), data)
			return err
		}
		for {
			header, err := reader.ReadString('\n')
			if err == io.EOF {
				done <- nil
				return
			}
			if err != nil {
				done <- err
				return
			}
			var length int
			if _, err := fmt.Sscanf(strings.TrimSpace(header), "Content-Length: %d", &length); err != nil {
				done <- err
				return
			}
			if _, err := reader.ReadString('\n'); err != nil {
				done <- err
				return
			}
			data := make([]byte, length)
			if _, err := io.ReadFull(reader, data); err != nil {
				done <- err
				return
			}
			var request struct {
				ID     any            `json:"id"`
				Method string         `json:"method"`
				Params map[string]any `json:"params"`
			}
			if err := json.Unmarshal(data, &request); err != nil {
				done <- err
				return
			}
			if request.ID == nil {
				continue
			}
			result := map[string]any{}
			switch request.Method {
			case "connect":
				result = map[string]any{"ok": true, "protocolVersion": 3}
			case "session.create":
				requests <- request.Params
				sessionID, _ = request.Params["sessionId"].(string)
				result = map[string]any{"sessionId": sessionID}
			case "session.send":
				result = map[string]any{"messageId": "fixture-message"}
				if mode == "send-error" {
					if err := write(map[string]any{"jsonrpc": "2.0", "id": request.ID, "error": map[string]any{"code": -32000, "message": "fixture send failed"}}); err != nil {
						done <- err
						return
					}
					continue
				}
			}
			if err := write(map[string]any{"jsonrpc": "2.0", "id": request.ID, "result": result}); err != nil {
				done <- err
				return
			}
			if request.Method == "session.send" && mode != "timeout" {
				eventType, data := "assistant.message_delta", map[string]any{"deltaContent": "fixture response"}
				if mode == "message" {
					eventType, data = "assistant.message", map[string]any{"content": "fixture response"}
				}
				if mode == "session-error" {
					eventType, data = "session.error", map[string]any{"message": "fixture session failed"}
				}
				for _, event := range []map[string]any{
					{"type": eventType, "data": data},
					{"type": "session.idle", "data": map[string]any{}},
				} {
					event["id"] = "fixture-event"
					event["timestamp"] = "2026-01-01T00:00:00Z"
					if err := write(map[string]any{"jsonrpc": "2.0", "method": "session.event", "params": map[string]any{"sessionId": sessionID, "event": event}}); err != nil {
						done <- err
						return
					}
				}
			}
		}
	}()
	client := copilot.NewClient(&copilot.ClientOptions{
		Connection: copilot.URIConnection{URL: listener.Addr().String()}, LogLevel: "error",
	})
	t.Cleanup(func() {
		if err := client.Stop(); err != nil {
			t.Error(err)
		}
		if err := listener.Close(); err != nil {
			t.Error(err)
		}
		select {
		case err := <-done:
			if err != nil {
				t.Error(err)
			}
		case <-time.After(2 * time.Second):
			t.Error("fixture connection did not close")
		}
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Start(ctx); err != nil {
		t.Fatal(err)
	}
	return client, requests
}

func TestPinnedSDKEmptyVersusUnset(t *testing.T) {
	client, requests := fakeSDK(t, "timeout")
	for _, tools := range [][]string{nil, {}} {
		config := &copilot.SessionConfig{
			AvailableTools: tools,
			OnPermissionRequest: func(_ copilot.PermissionRequest, _ copilot.PermissionInvocation) (rpc.PermissionDecision, error) {
				return &rpc.PermissionDecisionReject{}, nil
			},
		}
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		session, err := client.CreateSession(ctx, config)
		cancel()
		if err != nil {
			t.Fatal(err)
		}
		wire := <-requests
		if tools == nil {
			if wire["availableTools"] != nil {
				t.Fatalf("unset must remain null, got %#v", wire)
			}
		} else if allowed, ok := wire["availableTools"].([]any); !ok || len(allowed) != 0 {
			t.Fatalf("explicit empty must remain [], got %#v", wire)
		}
		if wire["requestPermission"] != true {
			t.Fatalf("deny handler must be registered: %#v", wire)
		}
		if err := session.Disconnect(); err != nil {
			t.Fatal(err)
		}
	}
}
