import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';

export type RealtimeEvent = {
  organizationId: string;
  resource: 'client' | 'project' | 'task' | 'comment' | 'member';
  action: 'created' | 'updated' | 'deleted';
  projectId?: string;
  resourceId?: string;
};

@Injectable()
export class RealtimeService {
  readonly events = new EventEmitter();

  publish(event: RealtimeEvent) {
    this.events.emit('changed', event);
  }
}
