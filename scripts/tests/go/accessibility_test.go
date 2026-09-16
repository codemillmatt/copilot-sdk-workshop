package main

import (
	"testing"

	copilot "github.com/github/copilot-sdk/go"
	"github.com/github/copilot-sdk/go/rpc"
)

func TestExactNavigationPermission(t *testing.T) {
	target := "https://example.test/page?review=yes"
	handler := permissionForTarget(target)
	for _, entry := range []struct {
		server, tool, url string
		allowed           bool
	}{
		{"playwright", "browser_navigate", target, true},
		{"playwright", "playwright-browser_navigate", target, true},
		{"playwright", "browser_navigate", target + "#different", false},
		{"playwright", "browser_navigate", "https://example.test/other", false},
		{"playwright", "browser_navigate", "", false},
		{"", "browser_navigate", target, false},
		{"other", "browser_navigate", target, false},
		{"playwright", "", target, false},
		{"playwright", "browser_click", target, false},
	} {
		decision, err := handler(copilot.PermissionRequestMCP{
			ServerName: entry.server, ToolName: entry.tool, Args: map[string]any{"url": entry.url},
		}, copilot.PermissionInvocation{})
		if err != nil {
			t.Fatal(err)
		}
		_, approved := decision.(*rpc.PermissionDecisionApproveOnce)
		if approved != entry.allowed {
			t.Fatalf("%+v: %#v", entry, decision)
		}
	}
	for _, request := range []copilot.PermissionRequest{nil, copilot.PermissionRequestWrite{FileName: "out.html"}, copilot.PermissionRequestMCP{ServerName: "playwright", ToolName: "browser_navigate"}} {
		decision, err := handler(request, copilot.PermissionInvocation{})
		if _, rejected := decision.(*rpc.PermissionDecisionReject); !rejected || err != nil {
			t.Fatalf("missing/unknown request not rejected: %#v, %v", decision, err)
		}
	}
}
