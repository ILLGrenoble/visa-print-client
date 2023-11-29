export class JobProcessedEvent {
    jobId: number;
    fileName: string;
    fileLength: number;

    constructor(data?: Partial<JobProcessedEvent>) {
        Object.assign(this, data);
    }
}
