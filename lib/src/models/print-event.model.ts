import {ErrorEvent} from "./error-event.model";
import {PrintJobChunkEvent} from "./print-job-chunk-event.model";
import {PrintJobAvailableEvent} from "./print-job-available-event.model";
import {PrintJobHandledEvent} from "./print-job-handled-event.model";

export class PrintEvent {
    type: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PRINT_JOB_CHUNK_RECEIVED' | 'PRINT_JOB_AVAILABLE' | 'PRINT_JOB_HANDLED' | 'PRINT_ENABLED' | 'PRINT_DISABLED';
    connectionId: string;
    data?: ErrorEvent | PrintJobChunkEvent | PrintJobAvailableEvent | PrintJobHandledEvent;

    constructor(data?: Partial<PrintEvent>) {
        Object.assign(this, data);
    }
}
