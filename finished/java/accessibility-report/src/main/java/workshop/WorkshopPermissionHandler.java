package workshop;

import com.github.copilot.rpc.PermissionHandler;
import com.github.copilot.rpc.PermissionRequestResult;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

public final class WorkshopPermissionHandler {
    private WorkshopPermissionHandler() {
    }

    public static PermissionHandler createForTarget(URI target) {
        Objects.requireNonNull(target, "target");
        return (request, ignored) -> CompletableFuture.completedFuture(
                request != null && "mcp".equals(request.getKind())
                        && !Boolean.TRUE.equals(request.getManagedApprovalRequired())
                        && isExactNavigation(request.getExtensionData(), target)
                        ? PermissionRequestResult.approveOnce()
                        : PermissionRequestResult.reject(
                                "This workshop allows Playwright to navigate only to the exact requested target."));
    }

    private static boolean isExactNavigation(Map<String, Object> request, URI target) {
        if (request == null || !"playwright".equals(request.get("serverName"))
                || !(request.get("toolName") instanceof String toolName)
                || !("browser_navigate".equals(toolName) || "playwright-browser_navigate".equals(toolName))
                || !(request.get("args") instanceof Map<?, ?> args)
                || !(args.get("url") instanceof String requested)) {
            return false;
        }
        try {
            URI candidate = new URI(requested);
            return equalsIgnoreCase(candidate.getScheme(), target.getScheme())
                    && equalsIgnoreCase(candidate.getHost(), target.getHost())
                    && candidate.getPort() == target.getPort()
                    && Objects.equals(candidate.getRawUserInfo(), target.getRawUserInfo())
                    && Objects.equals(candidate.getRawPath(), target.getRawPath())
                    && Objects.equals(candidate.getRawQuery(), target.getRawQuery())
                    && Objects.equals(candidate.getRawFragment(), target.getRawFragment());
        } catch (URISyntaxException exception) {
            return false;
        }
    }

    private static boolean equalsIgnoreCase(String left, String right) {
        return left == null ? right == null : right != null && left.equalsIgnoreCase(right);
    }
}
