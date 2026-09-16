package main

import (
	"context"
	"encoding/json"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	copilot "github.com/github/copilot-sdk/go"
	"github.com/github/copilot-sdk/go/rpc"
)

func TestFactBoundsAndTool(t *testing.T) {
	for _, facts := range [][]string{nil, {" ", "\n"}, {strings.Repeat("x", 501)}, strings.Split(strings.Repeat("fact,", 20)+"fact", ",")} {
		if _, err := BoundFacts(facts); err == nil {
			t.Fatalf("accepted invalid facts: %v", facts)
		}
	}
	facts := make([]string, 20)
	for i := range facts {
		facts[i] = strings.Repeat("界", 500)
	}
	if result, err := BoundFacts(facts); err != nil || len(result) != 20 {
		t.Fatalf("boundary rejected: %v", err)
	}
	input := []string{"  approved fact  ", ""}
	tool, err := ApprovedFactLookup(input)
	if err != nil {
		t.Fatal(err)
	}
	input[0] = "changed outside the tool"
	if tool.Name != ApprovedFactLookupName || !tool.SkipPermission || tool.Handler == nil {
		t.Fatal("approved fact tool contract changed")
	}
	result, err := tool.Handler(copilot.ToolInvocation{Arguments: map[string]any{}})
	if err != nil {
		t.Fatal(err)
	}
	encoded, err := json.Marshal(result)
	if err != nil || !strings.Contains(string(encoded), "approved fact") || strings.Contains(string(encoded), "changed outside") {
		t.Fatalf("tool did not retain approved facts: %s, %v", encoded, err)
	}
}

func validExhibit(words int) string {
	return "# Visitor story\n## Narrative\n" + strings.Repeat("history ", words) +
		"\n## Visitor questions\n1. What do you notice?\n2. What might you ask?\n3. What will you remember?"
}

func TestStructuralFixtures(t *testing.T) {
	for _, count := range []int{99, 100, 120, 140, 141} {
		verdict := ValidateExhibit(validExhibit(count))
		if verdict.Valid != (count >= 100 && count <= 140) || verdict.Narrative.WordCount != count {
			t.Fatalf("%d words: %+v", count, verdict)
		}
	}
	fixture := validExhibit(120)
	for _, invalid := range []string{
		strings.Replace(fixture, "# Visitor story\n", "", 1),
		fixture + "\n# Another title",
		strings.Replace(fixture, "## Narrative", "## Background", 1),
		strings.Replace(fixture, "## Visitor questions", "## Questions", 1),
		strings.Replace(fixture, "3. What will you remember?", "", 1),
		strings.Replace(fixture, "What do you notice?", "A statement.", 1),
		fixture + "\nGitHub Copilot",
	} {
		if ValidateExhibit(invalid).Valid {
			t.Fatalf("invalid fixture passed: %s", invalid)
		}
	}
	if !strings.Contains(FormatValidation(ValidateExhibit(fixture)), "do not prove factual grounding") {
		t.Fatal("structural caveat is missing")
	}
}

func assertDecision(t *testing.T, handler copilot.PermissionHandlerFunc, request copilot.PermissionRequest, allowed bool) {
	t.Helper()
	result, err := handler(request, copilot.PermissionInvocation{})
	if err != nil {
		t.Fatal(err)
	}
	_, approved := result.(*rpc.PermissionDecisionApproveOnce)
	_, rejected := result.(*rpc.PermissionDecisionReject)
	if approved != allowed || !allowed && !rejected {
		t.Fatalf("unexpected decision for %#v: %#v", request, result)
	}
}

func TestMuseumPermissions(t *testing.T) {
	directory := t.TempDir()
	for _, tool := range []string{"search", "readArticle", "wikipedia-search", "wikipedia-readArticle", "", "edit"} {
		request := copilot.PermissionRequestMCP{ServerName: "wikipedia", ToolName: tool}
		assertDecision(t, WikipediaPermissionHandler(), request, tool != "" && tool != "edit")
		assertDecision(t, DenyUnexpectedPermission, request, false)
	}
	for _, request := range []copilot.PermissionRequest{
		nil, (*copilot.PermissionRequestMCP)(nil),
		copilot.PermissionRequestMCP{ToolName: "search"},
		copilot.PermissionRequestMCP{ServerName: "other", ToolName: "search"},
		copilot.PermissionRequestWrite{FileName: ExhibitFileName},
	} {
		assertDecision(t, WikipediaPermissionHandler(), request, false)
	}
	for _, name := range []string{"exhibit.html", "./exhibit.html", filepath.Join(directory, "exhibit.html"), "other.html", "../exhibit.html", ""} {
		allowed := name == "exhibit.html" || name == "./exhibit.html" || name == filepath.Join(directory, "exhibit.html")
		assertDecision(t, ExhibitWritePermission(directory), copilot.PermissionRequestWrite{FileName: name}, allowed)
	}
	for _, request := range []copilot.PermissionRequest{nil, (*copilot.PermissionRequestWrite)(nil), copilot.PermissionRequestMCP{ServerName: "wikipedia", ToolName: "search"}} {
		assertDecision(t, ExhibitWritePermission(directory), request, false)
	}
}

func TestModelReportedSourceParsing(t *testing.T) {
	for _, input := range []string{"no section", "notes\n## Sources\nnot a citation", "## Sources\n- : https://example.test"} {
		if len(ExtractSources(input).Sources) != 0 {
			t.Fatal("malformed citations must remain visibly absent")
		}
	}
	result := ExtractSources("notes\n## Sources\n- Example: https://en.wikipedia.org/wiki/Example")
	if result.Body != "notes" || !reflect.DeepEqual(result.Sources, []Source{{Title: "Example", URL: "https://en.wikipedia.org/wiki/Example"}}) {
		t.Fatalf("unexpected simple parser result: %+v", result)
	}
}

func TestStreamingOutcomes(t *testing.T) {
	for _, mode := range []string{"delta", "message", "send-error", "session-error", "timeout"} {
		t.Run(mode, func(t *testing.T) {
			client, _ := fakeSDK(t, mode)
			session, err := client.CreateSession(context.Background(), &copilot.SessionConfig{
				AvailableTools: []string{}, OnPermissionRequest: DenyUnexpectedPermission,
			})
			if err != nil {
				t.Fatal(err)
			}
			defer func() {
				if err := session.Disconnect(); err != nil {
					t.Error(err)
				}
			}()
			content, err := StreamExhibit(session, "fixture only", 100*time.Millisecond)
			if mode == "delta" || mode == "message" {
				if err != nil || content != "fixture response" {
					t.Fatalf("content %q, error %v", content, err)
				}
			} else if err == nil {
				t.Fatalf("%s was hidden", mode)
			}
		})
	}
}
