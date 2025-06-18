// Infrastructure Layer Exports
// This module exports all infrastructure components following Clean Architecture principles

// Chat Integration Components
export { VSCodeChatIntegration } from './vscode-chat-integration';
export { GitHubCopilotIntegration } from './github-copilot-integration';

// Configuration Repository
export { WorkspaceConfigurationRepository } from './workspace-configuration-repository';

// Scheduling Engine
export { PromptSchedulingEngine } from './prompt-scheduling-engine';
export type { RateLimitConfig, ScheduledExecution } from './prompt-scheduling-engine';

// AI Session Monitoring
export { AISessionMonitoringService } from './ai-session-monitoring-service';
export type { 
    ChatActivityInfo, 
    WorkspaceActivity, 
    SessionMonitoringConfig 
} from './ai-session-monitoring-service';

// Template Repository
export { WorkspaceTemplateRepository } from './workspace-template-repository';

// Chat Interfaces and Types
export {
    IChatProvider,
    ChatResponse,
    ChatProviderConfig,
    ChatProviderUnavailableError,
    UnsupportedTargetError
} from './chat-interfaces';
