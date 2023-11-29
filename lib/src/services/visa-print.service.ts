import {Injectable} from "@angular/core";
import {BehaviorSubject, filter, Observable, Subject} from "rxjs";
import {JobChunkEvent, PrintEvent, PrintJob} from "../models";
import {Socket} from "socket.io-client";
import { io } from 'socket.io-client';
import {ErrorEvent} from "../models/error-event.model";
import {ManagerOptions} from "socket.io-client/build/esm/manager";
import {SocketOptions} from "socket.io-client/build/esm/socket";

export type ConnectionData = {
    host?: string;
    path?: string;
    token?: string;
}

export type Connection = {
    id: string;
    socket: Socket;
    event$: Subject<PrintEvent>;
    jobs: Map<number, PrintJob[]>;
}


@Injectable({
    providedIn: 'root'
})export class VisaPrintService {

    private _connections: Connection[] = [];
    private static _connectionCounter = 1;

    private _iframe: HTMLIFrameElement;
    private _pdfUrl: string;

    public connect(data: ConnectionData): Observable<PrintEvent> {
        const printEvents$ = new BehaviorSubject<PrintEvent>(null);

        const socketOptions: Partial<ManagerOptions & SocketOptions> = {
            transports: ['websocket'],
            timeout: 1000,
            reconnection: true,
            reconnectionDelayMax: 10000,
        }

        if (data.path) {
            socketOptions.path = data.path;
        }

        if (data.token) {
            socketOptions.auth = {
                token: data.token
            };
        }

        const connectionId = `print-connection-${VisaPrintService._connectionCounter++} `;
        const socket = io(data.host || '', socketOptions);
        const jobs = new Map<number, PrintJob[]>();
        const connection: Connection = {
            id: connectionId,
            event$: printEvents$,
            socket: socket,
            jobs: jobs,
        };

        socket.on('connect', () => {
            this._connections.push(connection);
            printEvents$.next(new PrintEvent({type: 'CONNECTED', connectionId}));
        });

        socket.on('connect_error', (error) => {
            printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'CONNECTION_ERROR', message: error.message})}));
        });

        socket.on('disconnect', () => {
            this._connections = this._connections.filter(connection => connection.id !== connectionId);
            printEvents$.next(new PrintEvent({type: 'DISCONNECTED', connectionId}));
        });

        socket.on('error', (error) => {
            printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'ERROR', message: error.message})}));
        });

        socket.on('exception', (e) => {
            printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'EXCEPTION', message: e.message})}));
        });

        socket.on('print', (printJob: PrintJob, ack) => {
            const {jobId, chunkId, chunkCount, chunkLength, data} = printJob;
            if (chunkLength !== data.length) {
                console.error(`printer job data of chunk ${chunkId}/${chunkCount} for job ${jobId} ${printJob.fileName} has incorrect length`)
                printEvents$.next(new PrintEvent({type: 'ERROR', connectionId, data: new ErrorEvent({type: 'ERROR', message: 'Incorrect data length in chunk'})}));
                ack(false);
                return;
            }

            ack(true);
            printEvents$.next(new PrintEvent({type: 'JOB_CHUNK_RECEIVED', connectionId, data: new JobChunkEvent({jobId, chunkId, chunkCount, chunkLength})}));
            this.handlePrintJob(connection, printJob);
        });

        return printEvents$.pipe(
            filter(data => data != null)
        );
    }

    public disconnect(connectionId: string): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            connection.socket.disconnect();
        }
    }

    public enablePrinting(connectionId: string): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            connection.socket.emit('enablePrint', null, (data: boolean) => {
                this.initialiseReceiver();
                connection.event$.next(new PrintEvent({type: 'PRINT_ENABLED', connectionId}));
            });
        }
    }

    public disablePrinting(connectionId: string): void {
        const connection = this._connections.find(connection => connection.id === connectionId);
        if (connection) {
            connection.socket.emit('disablePrint', null, (data: boolean) => {
                connection.event$.next(new PrintEvent({type: 'PRINT_DISABLED', connectionId}));
            });
        }
    }

    private initialiseReceiver(): void {
        if (!this._iframe) {
            this._iframe = document.createElement('iframe');
            this._iframe.style.display = 'none';
            document.body.appendChild(this._iframe);
            this._iframe.onload = () => {
                URL.revokeObjectURL(this._pdfUrl);

                this._iframe.focus();
                this._iframe.contentWindow?.print();
            };
        }
    }

    private handlePrintJob(connection: Connection, printJob: PrintJob): void {
        const { jobId, chunkId, chunkCount } = printJob;
        if (!connection.jobs.has(jobId)) {
            connection.jobs.set(jobId, []);
        }
        connection.jobs.get(jobId)?.push(printJob);

        if (chunkId === chunkCount) {
            this.processJob(connection, printJob);
        }
    }

    private processJob(connection: Connection, printJob: PrintJob): void {
        const chunks = connection.jobs.get(printJob.jobId);
        if (chunks) {
            // Remove from jobs
            connection.jobs.delete(printJob.jobId);

            // Concatenate all the data
            if (chunks.length > 0 && chunks.length === printJob.chunkCount) {
                const base64 = chunks.reduce((acc, chunk) => {
                    return acc + chunk.data
                }, '');

                const data = atob(base64);
                if (data.length === printJob.fileLength) {
                    this.loadPDF(data);
                }
            }
        }
    }

    private loadPDF(data: string): void {
        // Convert to binary data
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            bytes[i] = data.charCodeAt(i);
        }
        const blob = new Blob([bytes], {type: 'application/pdf'});
        this._pdfUrl = URL.createObjectURL(blob);

        // Set the pdf in the iframe
        this._iframe.src = this._pdfUrl;
    }
}
