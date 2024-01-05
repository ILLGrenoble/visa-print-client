import {ErrorEvent} from "./error-event.model";
import {PrintJobChunkEvent} from "./print-job-chunk-event.model";
import {PrintJobAvailableEvent} from "./print-job-available-event.model";

export class PrintEvent {
    type: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PRINT_JOB_CHUNK_RECEIVED' | 'PRINT_JOB_TRANSFER_STARTED' | 'PRINT_JOB_TRANSFER_TERMINATED' | 'PRINT_JOB_AVAILABLE' | 'PRINT_JOB_HANDLED' | 'PRINT_ENABLED' | 'PRINT_DISABLED';
    connectionId: string;
    jobId?: number;
    data?: ErrorEvent | PrintJobChunkEvent | PrintJobAvailableEvent;

    constructor(data?: Partial<PrintEvent>) {
        Object.assign(this, data);
    }
}
