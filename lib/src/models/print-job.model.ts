export interface PrintJob {
    jobId: number;
    chunkId: number;
    chunkCount: number;
    chunkLength: number;
    fileName: string;
    fileLength: number;
    data: string;
}
