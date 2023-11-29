export class JobChunkEvent {
    jobId: number;
    chunkId: number;
    chunkCount: number;
    chunkLength: number;

    constructor(data?: Partial<JobChunkEvent>) {
        Object.assign(this, data);
    }
}
