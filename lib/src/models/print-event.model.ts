import {JobChunkEvent} from "./job-chunk-event.model";
import {JobProcessedEvent} from "./job-processed-event.model";
import {ErrorEvent} from "./error-event.model";

export class PrintEvent {
    type: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'JOB_CHUNK_RECEIVED' | 'JOB_PROCESSED' | 'PRINT_ENABLED' | 'PRINT_DISABLED';
    connectionId: string;
    data?: ErrorEvent | JobChunkEvent | JobProcessedEvent;

    constructor(data?: Partial<PrintEvent>) {
        Object.assign(this, data);
    }
}
