package workshop;

import com.github.copilot.CopilotSession;
import com.github.copilot.generated.AssistantMessageDeltaEvent;
import com.github.copilot.generated.AssistantMessageEvent;
import com.github.copilot.generated.ToolExecutionCompleteEvent;
import com.github.copilot.generated.ToolExecutionStartEvent;
import com.github.copilot.rpc.MessageOptions;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicBoolean;

public final class CuratorStreamer {
    public static final Duration GENERATION_TIMEOUT = Duration.ofSeconds(120);
    public static final Duration RESEARCH_TIMEOUT = Duration.ofSeconds(90);

    private CuratorStreamer() {
    }

    public static String streamExhibit(CopilotSession session, String prompt) throws Exception {
        return streamExhibit(session, prompt, GENERATION_TIMEOUT);
    }

    public static String streamExhibit(CopilotSession session, String prompt, Duration timeout) throws Exception {
        if (timeout.isNegative() || timeout.toMillis() == 0) {
            throw new IllegalArgumentException("The response timeout must be positive.");
        }
        StringBuffer assistantText = new StringBuffer();
        AtomicBoolean receivedDelta = new AtomicBoolean(false);
        try (var subscription = session.on(event -> {
            if (event instanceof AssistantMessageDeltaEvent delta && delta.getData() != null) {
                String content = delta.getData().deltaContent();
                if (content != null && !content.isEmpty()) {
                    receivedDelta.set(true);
                    assistantText.append(content);
                    System.out.print(content);
                }
            } else if (event instanceof AssistantMessageEvent message && message.getData() != null) {
                String content = message.getData().content();
                if (!receivedDelta.getAndSet(false) && content != null && !content.isEmpty()) {
                    assistantText.append(content);
                    System.out.print(content);
                }
            } else if (event instanceof ToolExecutionStartEvent tool && tool.getData() != null) {
                System.out.println("\n[tool:start] " + tool.getData().toolName());
            } else if (event instanceof ToolExecutionCompleteEvent tool && tool.getData() != null) {
                System.out.println("[tool:done] success=" + tool.getData().success());
            }
        })) {
            // The SDK wait handles session.error, idle, send failures and timeout, and releases its listener.
            var response = session.sendAndWait(new MessageOptions().setPrompt(prompt), timeout.toMillis());
            try {
                response.get();
            } finally {
                response.cancel(true);
            }
            System.out.println();
            return assistantText.toString();
        }
    }
}
