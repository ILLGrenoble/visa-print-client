import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { io } from 'socket.io-client';

type FileData = {
  fileName: string;
  length: number;
  data: string;
};

type PrintJob = {
  jobId: number;
  chunkId: number;
  chunkCount: number;
  chunkLength: number;
  fileName: string;
  fileLength: number;
  data: string;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  private _iframe: HTMLIFrameElement;
  private _pdfUrl: string;

  private _jobs: Map<number, PrintJob[]> = new Map<number, PrintJob[]>();

  ngOnInit() {


    const socket = io('', {
      path: '/ws/print',
      transports: ['websocket'],
      auth: {
        token: 'ABCDEF123456789',
      },
      timeout: 1000,
      reconnection: true,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      socket.emit('enablePrint', null, (data: boolean) => {
        console.log(`Printing is enabled: ${data}`);
        this.initialiseReceiver();
      });
    });

    socket.on('connect_error', (error) => {
      console.error(`Failed to connect to print server: ${error.message}`);
    });

    socket.on('disconnect', () => {
      console.info(`Server has disconnected`);
    });

    socket.on('error', (error) => {
      console.error(`Received error from print server: ${error.message}`);
    });

    socket.on('exception', (e) => {
      console.error(`Received exception from print server: ${e.message}`);
    });

    socket.on('print', (printJob: PrintJob, ack) => {
      if (printJob.chunkLength !== printJob.data.length) {
        console.error(`printer job data of chunk ${printJob.chunkId}/${printJob.chunkCount} for job ${printJob.jobId} ${printJob.fileName} has incorrect length`)
        ack(false);
        return;
      }

      ack(true);
      this.handlePrintJob(printJob);
    });

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

  private handlePrintJob(printJob: PrintJob): void {
    const { jobId, chunkId, chunkCount } = printJob;
    if (!this._jobs.has(jobId)) {
      this._jobs.set(jobId, []);
    }
    this._jobs.get(jobId)?.push(printJob);

    if (chunkId === chunkCount) {
      this.processJob(printJob);
    }
  }

  private processJob(printJob: PrintJob): void {
    const chunks = this._jobs.get(printJob.jobId);
    if (chunks) {
      // Remove from jobs
      this._jobs.delete(printJob.jobId);

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

}
