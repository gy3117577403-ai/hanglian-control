import { WorkbenchRefreshEvent } from '../models/DocumentModels';

export type WorkbenchRefreshListener = (event: WorkbenchRefreshEvent) => void;

export class WorkbenchRefreshBus {
  private static listeners: WorkbenchRefreshListener[] = [];

  static subscribe(listener: WorkbenchRefreshListener): () => void {
    WorkbenchRefreshBus.listeners.push(listener);
    return () => {
      WorkbenchRefreshBus.listeners = WorkbenchRefreshBus.listeners.filter((item: WorkbenchRefreshListener) => item !== listener);
    };
  }

  static emit(event: WorkbenchRefreshEvent): void {
    WorkbenchRefreshBus.listeners.forEach((listener: WorkbenchRefreshListener) => {
      listener(event);
    });
  }
}
