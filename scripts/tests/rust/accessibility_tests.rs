use super::*;
use serde_json::json;

#[tokio::test]
async fn exact_navigation_requires_kind_and_payload() {
    let target = "https://example.test/page?review=yes";
    let handler = ScopedPermissions {
        target: Url::parse(target).unwrap(),
    };
    for (server, tool, requested, allowed) in [
        ("playwright", "browser_navigate", target, true),
        ("playwright", "playwright-browser_navigate", target, true),
        (
            "playwright",
            "browser_navigate",
            "https://example.test/other",
            false,
        ),
        ("playwright", "browser_navigate", "", false),
        ("", "browser_navigate", target, false),
        ("other", "browser_navigate", target, false),
        ("playwright", "", target, false),
        ("playwright", "browser_click", target, false),
    ] {
        let payload =
            json!({"kind":"mcp","serverName":server,"toolName":tool,"args":{"url":requested}});
        for value in [payload.clone(), json!({"permissionRequest":payload})] {
            assert_permission(&handler, value, allowed).await;
        }
    }
    for value in [
        json!({}),
        json!({"kind":"mcp","serverName":"playwright","toolName":"browser_navigate"}),
        json!({"serverName":"playwright","toolName":"browser_navigate","args":{"url":target}}),
        json!({"kind":"write","serverName":"playwright","toolName":"browser_navigate","args":{"url":target}}),
        json!({"permissionRequest":null,"kind":"mcp","serverName":"playwright","toolName":"browser_navigate","args":{"url":target}}),
        json!({"kind":"write","permissionRequest":{"kind":"mcp","serverName":"playwright","toolName":"browser_navigate","args":{"url":target}}}),
    ] {
        assert_permission(&handler, value, false).await;
    }
}

async fn assert_permission(handler: &ScopedPermissions, payload: serde_json::Value, allowed: bool) {
    let result = handler
        .handle(
            SessionId::new("fixture"),
            RequestId::new("fixture"),
            serde_json::from_value(payload).unwrap(),
        )
        .await;
    let PermissionResult::Decision { decision, .. } = result else {
        panic!("handler did not answer");
    };
    assert_eq!(
        serde_json::to_value(decision).unwrap()["kind"],
        if allowed { "approve-once" } else { "reject" }
    );
}
