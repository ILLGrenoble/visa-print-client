export class PrintJobChunkEvent {
    jobId: number;
    chunkId: number;
    chunkCount: number;
    chunkLength: number;

    constructor(data?: Partial<PrintJobChunkEvent>) {
        Object.assign(this, data);
    }
}
