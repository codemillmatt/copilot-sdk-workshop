from __future__ import annotations

import importlib.util
import asyncio
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[3]


def load(name: str, relative: str):
    path = ROOT / relative
    sys.path.insert(0, str(path.parent))
    try:
        spec = importlib.util.spec_from_file_location(name, path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[name] = module
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)


museum = load("museum_contracts", "start-museum/python/curator.py")
accessibility = load("accessibility_contracts", "start-accessibility/python/workshop.py")


class WorkshopContracts(unittest.TestCase):
    def test_artifact_evidence(self):
        for helpers in (museum, accessibility):
            with self.subTest(module=helpers.__name__), tempfile.TemporaryDirectory() as directory:
                path = Path(directory, "output.html")
                absent = helpers.capture_artifact_state(directory, "output.html")
                for content in (None, ""):
                    if content is not None:
                        path.write_text(content)
                    with self.assertRaisesRegex(ValueError, "No output update"):
                        helpers.verify_artifact_update(absent)
                path.write_text("first")
                helpers.verify_artifact_update(absent)
                before = helpers.capture_artifact_state(directory, "output.html")
                with self.assertRaisesRegex(ValueError, "No output update"):
                    helpers.verify_artifact_update(before)
                path.write_text("other")
                helpers.verify_artifact_update(before)
                Path(directory, "folder").mkdir()
                with self.assertRaisesRegex(ValueError, "regular file"):
                    helpers.capture_artifact_state(directory, "folder")
                Path(directory, "link.html").symlink_to(path)
                with self.assertRaisesRegex(ValueError, "regular file"):
                    helpers.capture_artifact_state(directory, "link.html")

    def test_facts_and_structure(self):
        for facts in ([], ["fact"] * 21, ["x" * 501]):
            with self.assertRaises(ValueError):
                museum.bound_facts(facts)
        self.assertEqual(museum.bound_facts([" fact ", ""]), ["fact"])
        valid = ("# Test exhibit\n## Narrative\n" + "gallery " * 110 +
                 "\n## Visitor questions\n1. What do you notice?\n2. What would you ask?\n3. What might change?")
        self.assertTrue(museum.validate_exhibit(valid).valid)
        self.assertFalse(museum.validate_exhibit(valid.replace("gallery", "terminal", 1)).valid)
        self.assertFalse(museum.validate_exhibit(valid.replace("## Narrative", "Narrative")).valid)
        self.assertFalse(museum.validate_exhibit(valid.replace("3. What might change?", "")).valid)

    def test_citations_are_model_reported(self):
        self.assertFalse(museum.extract_sources("## Sources\nmalformed").sources)
        self.assertEqual(museum.extract_sources(
            "## Sources\n- Unverified: https://example.org/article"
        ).sources[0].url, "https://example.org/article")

    def test_scoped_permissions(self):
        target = "https://example.org/Target?q=One"
        handler = accessibility.permission_for_target(target)
        fields = dict(kind="mcp", server_name="playwright", tool_name="browser_navigate")
        self.assertEqual(handler(SimpleNamespace(**fields, args={"url": target}), None).kind, "approve-once")
        for args in (None, [], "", {}, {"url": "http://[broken"}, {"url": "https://example.org/target?q=One"}):
            self.assertEqual(handler(SimpleNamespace(**fields, args=args), None).kind, "reject")
        self.assertEqual(handler(SimpleNamespace(kind="mcp"), None).kind, "reject")
        self.assertEqual(museum.deny_unexpected_permission(SimpleNamespace(kind="shell"), None).kind, "reject")
        with tempfile.TemporaryDirectory() as directory:
            write = museum.exhibit_write_permission(directory)
            self.assertEqual(write(SimpleNamespace(kind="write", file_name="exhibit.html"), None).kind, "approve-once")
            self.assertEqual(write(SimpleNamespace(kind="write", file_name="notes.txt"), None).kind, "reject")
            self.assertEqual(write(SimpleNamespace(kind="write", file_name="../exhibit.html"), None).kind, "reject")


class StreamingContracts(unittest.IsolatedAsyncioTestCase):
    async def test_stream_cleanup(self):
        for outcome in ("idle", "session-error", "send-error", "send-timeout", "idle-timeout"):
            with self.subTest(outcome=outcome):
                class SessionDouble:
                    removals = 0

                    def on(self, listener):
                        self.listener = listener

                        def unsubscribe():
                            self.removals += 1
                        return unsubscribe

                    async def send(self, _prompt):
                        if outcome == "send-error":
                            raise RuntimeError("send failed")
                        if outcome == "send-timeout":
                            await asyncio.Future()
                        if outcome == "idle":
                            self.listener(SimpleNamespace(data=museum.SessionIdleData()))
                        if outcome == "session-error":
                            self.listener(SimpleNamespace(data=museum.SessionErrorData(
                                error_type="test", message="turn failed")))

                session = SessionDouble()
                if outcome == "idle":
                    self.assertEqual(await museum.stream_exhibit(session, "test", 0.01), "")
                else:
                    with self.assertRaises((RuntimeError, TimeoutError)):
                        await museum.stream_exhibit(session, "test", 0.01)
                self.assertEqual(session.removals, 1)


if __name__ == "__main__":
    unittest.main()
