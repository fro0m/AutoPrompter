import { DateTime, TemplateId, SessionId } from './types';

export abstract class DomainEvent {
    readonly occurredOn: DateTime;
    readonly eventId: string;

    constructor() {
        this.occurredOn = DateTime.now();
        this.eventId = Math.random().toString(36).substr(2, 9);
    }
}

export class PromptSentEvent extends DomainEvent {
    constructor(
        public readonly templateId: TemplateId,
        public readonly content: string,
        public readonly target: string
    ) {
        super();
    }
}

export class AIIdleDetectedEvent extends DomainEvent {
    constructor(
        public readonly sessionId: SessionId,
        public readonly idleDuration: number
    ) {
        super();
    }
}

export class ConfigurationChangedEvent extends DomainEvent {
    constructor(
        public readonly changes: Record<string, any>
    ) {
        super();
    }
}

export class SessionStateChangedEvent extends DomainEvent {
    constructor(
        public readonly sessionId: SessionId,
        public readonly oldState: string,
        public readonly newState: string
    ) {
        super();
    }
}
