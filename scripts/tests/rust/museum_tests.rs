use super::*;
use serde_json::{Value, json};

#[tokio::test]
async fn fact_bounds_and_owned_tool() {
    for facts in [
        vec![],
        vec![" ".to_owned()],
        vec!["x".repeat(501)],
        vec!["fact".to_owned(); 21],
    ] {
        assert!(bound_facts(facts).is_err());
    }
    assert_eq!(bound_facts(vec!["界".repeat(500); 20]).unwrap().len(), 20);
    let mut input = vec!["  approved fact  ".to_owned(), "".to_owned()];
    let tool = approved_fact_lookup(&input).unwrap();
    input[0] = "changed outside the tool".to_owned();
    assert_eq!(tool.name, APPROVED_FACT_LOOKUP_NAME);
    assert!(tool.skip_permission);
    let mut invocation = ToolInvocation::default();
    invocation.arguments = json!({});
    let result = tool.handler().unwrap().call(invocation).await.unwrap();
    match result {
        ToolResult::Text(content) => {
            assert_eq!(
                serde_json::from_str::<Vec<String>>(&content).unwrap(),
                ["approved fact"]
            );
        }
        _ => panic!("expected approved facts as text"),
    }
}

fn valid_exhibit(words: usize) -> String {
    format!(
        "# Visitor story\n## Narrative\n{}\n## Visitor questions\n1. What do you notice?\n2. What might you ask?\n3. What will you remember?",
        "history ".repeat(words)
    )
}

#[test]
fn structural_fixtures() {
    for count in [99, 100, 120, 140, 141] {
        let verdict = validate_exhibit(&valid_exhibit(count));
        assert_eq!(verdict.valid, (100..=140).contains(&count));
        assert_eq!(verdict.narrative.word_count, count);
    }
    let fixture = valid_exhibit(120);
    for invalid in [
        fixture.replace("# Visitor story\n", ""),
        format!("{fixture}\n# Another title"),
        fixture.replace("## Narrative", "## Background"),
        fixture.replace("## Visitor questions", "## Questions"),
        fixture.replace("3. What will you remember?", ""),
        fixture.replace("What do you notice?", "A statement."),
        format!("{fixture}\nGitHub Copilot"),
    ] {
        assert!(!validate_exhibit(&invalid).valid);
    }
    assert!(
        format_validation(&validate_exhibit(&fixture)).contains("do not prove factual grounding")
    );
}

async fn decision(handler: &dyn PermissionHandler, payload: Value, expected: &str) {
    let result = handler
        .handle(
            SessionId::new("fixture"),
            RequestId::new("fixture"),
            serde_json::from_value(payload).unwrap(),
        )
        .await;
    let PermissionResult::Decision { decision, .. } = result else {
        panic!("permission handler did not answer");
    };
    assert_eq!(serde_json::to_value(decision).unwrap()["kind"], expected);
}

#[tokio::test]
async fn museum_permissions_preserve_nested_payloads() {
    let directory = std::env::current_dir().unwrap();
    let write = exhibit_write_permission(&directory);
    for tool in [
        "search",
        "readArticle",
        "wikipedia-search",
        "wikipedia-readArticle",
        "",
        "edit",
    ] {
        let payload = json!({"kind":"mcp","serverName":"wikipedia","toolName":tool});
        let expected = if matches!(tool, "" | "edit") {
            "reject"
        } else {
            "approve-once"
        };
        decision(&wikipedia_permission_handler(), payload.clone(), expected).await;
        decision(
            &wikipedia_permission_handler(),
            json!({"permissionRequest":payload}),
            expected,
        )
        .await;
        decision(&DenyUnexpectedPermissions, payload, "reject").await;
    }
    for payload in [
        json!({}),
        json!({"kind":"mcp","toolName":"search"}),
        json!({"kind":"mcp","serverName":"other","toolName":"search"}),
        json!({"serverName":"wikipedia","toolName":"search"}),
        json!({"kind":"shell","serverName":"wikipedia","toolName":"search"}),
        json!({"permissionRequest":"malformed","kind":"mcp","serverName":"wikipedia","toolName":"search"}),
        json!({"permissionRequest":{"serverName":"wikipedia","toolName":"search"}}),
        json!({"kind":"write","permissionRequest":{"kind":"mcp","serverName":"wikipedia","toolName":"search"}}),
    ] {
        decision(&wikipedia_permission_handler(), payload, "reject").await;
    }
    for name in [
        "exhibit.html",
        "./exhibit.html",
        "other.html",
        "../exhibit.html",
        "",
    ] {
        let expected = if matches!(name, "exhibit.html" | "./exhibit.html") {
            "approve-once"
        } else {
            "reject"
        };
        let payload = json!({"kind":"write","fileName":name});
        decision(&write, payload.clone(), expected).await;
        decision(&write, json!({"permissionRequest":payload}), expected).await;
    }
    decision(
        &write,
        json!({"kind":"write","fileName":directory.join("exhibit.html")}),
        "approve-once",
    )
    .await;
    for payload in [
        json!({}),
        json!({"kind":"write"}),
        json!({"fileName":"exhibit.html"}),
        json!({"kind":"shell","fileName":"exhibit.html"}),
        json!({"permissionRequest":null,"kind":"write","fileName":"exhibit.html"}),
        json!({"kind":"mcp","permissionRequest":{"kind":"write","fileName":"exhibit.html"}}),
    ] {
        decision(&write, payload, "reject").await;
    }
}

#[test]
fn sources_are_only_parsed_model_text() {
    for content in [
        "no section",
        "notes\n## Sources\nnot a citation",
        "## Sources\n- : https://example.test",
    ] {
        assert!(extract_sources(content).sources.is_empty());
    }
    let result =
        extract_sources("notes\n## Sources\n- Example: https://en.wikipedia.org/wiki/Example");
    assert_eq!(result.body, "notes");
    assert_eq!(result.sources.len(), 1);
    assert_eq!(result.sources[0].title, "Example");
}

#[tokio::test]
async fn streaming_outcomes() {
    for mode in ["delta", "message", "send-error", "session-error", "timeout"] {
        let (client, _requests, worker) = super::maintainer_sdk_tests::fake_sdk(mode).await;
        let mut config = github_copilot_sdk::types::SessionConfig::default()
            .with_permission_handler(Arc::new(DenyUnexpectedPermissions));
        config.available_tools = Some(vec![]);
        let session = client.create_session(config).await.unwrap();
        let result = stream_exhibit(&session, "fixture only", Duration::from_millis(100)).await;
        session.disconnect().await.unwrap();
        drop(session);
        client.stop().await.unwrap();
        client.force_stop();
        drop(client);
        tokio::task::spawn_blocking(move || worker.join().unwrap())
            .await
            .unwrap();
        if matches!(mode, "delta" | "message") {
            assert_eq!(result.unwrap(), "fixture response");
        } else {
            assert!(result.is_err(), "{mode} was hidden");
        }
    }
}
