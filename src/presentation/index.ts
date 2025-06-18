/**
 * Presentation Layer Exports
 * 
 * Exports all presentation layer components including:
 * - Sidebar providers
 * - WebView managers
 * - UI interfaces and types
 */

export { AutoPrompterSidebarProvider } from './autoprompter-sidebar-provider';
export { WebviewManager } from './webview-manager';
export { UIStateManager } from './ui-state-manager';
export {
    ISidebarProvider,
    IWebviewManager,
    IUIStateManager,
    UIState,
    WebViewMessage,
    WebViewResponse,
    WebViewMessageType
} from './interfaces';
