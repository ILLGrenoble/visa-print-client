import {ErrorEvent} from "./error-event.model";
import {PrintJobChunkEvent} from "./print-job-chunk-event.model";
import {PrintJobAvailableEvent} from "./print-job-available-event.model";

export type PrintEventType =
    'CONNECTING' |
    'CONNECTED' |
    'DISCONNECTED' |
    'ERROR' |
    'PRINT_JOB_CHUNK_RECEIVED' |
    'PRINT_JOB_TRANSFER_STARTED' |
    'PRINT_JOB_TRANSFER_TERMINATED' |
    'PRINT_JOB_AVAILABLE' |
    'PRINT_JOB_HANDLED' |
    'PRINT_DIALOG_FAILED' |
    'PRINT_ENABLED' |
    'PRINT_DISABLED';

export class PrintEvent {
    type: PrintEventType
    connectionId: string;
    jobId?: number;
    data?: ErrorEvent | PrintJobChunkEvent | PrintJobAvailableEvent;

    constructor(data?: Partial<PrintEvent>) {
        Object.assign(this, data);
    }
}
