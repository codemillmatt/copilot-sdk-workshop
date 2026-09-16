package main

import (
	"reflect"
	"testing"
)

func TestGenerationCapabilityProfile(t *testing.T) {
	directory := t.TempDir()
	config, err := generationConfig(directory, Apollo11Facts)
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(config.AvailableTools, []string{ApprovedFactLookupName}) ||
		len(config.Tools) != 1 || !config.Tools[0].SkipPermission || config.MCPServers != nil {
		t.Fatal("generation no longer exposes exactly the approved fact tool")
	}
	assertDecision(t, config.OnPermissionRequest, nil, false)
	if htmlConfig(directory).WorkingDirectory != directory {
		t.Fatal("HTML session and artifact verifier must use the same working directory")
	}
}
