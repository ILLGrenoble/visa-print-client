import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { io } from 'socket.io-client';

type FileData = {
  fileName: string;
  length: number;
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

  ngOnInit() {


    const socket = io('', {
      path: '/ws/print',
      transports: ['websocket'],
      auth: {
        token: 'ABCDEF123456789',
      },
      timeout: 1000,
      reconnection: false,
    });

    socket.on('connect', () => {
      socket.emit('enablePrint', null, (data: boolean) => {
        console.log(`got connected: ${data}`);
        this.initialiseReceiver();
      });
    });

    socket.on('connect_error', (error) => {
      console.error(`Failed to connect to print server: ${error.message}`);
    });

    socket.on('error', (error) => {
      console.error(`Received error from print server: ${error.message}`);
    });

    socket.on('exception', (e) => {
      console.error(`Received exception from print server: ${e.message}`);
    });

    socket.on('print', (fileData: FileData, ack) => {
      const data = atob(fileData.data);

      if (data.length === fileData.length) {
        console.log(`got printer data: ${fileData.fileName} with length ${fileData.length}`);
        ack(true);

        this.loadPDF(data);

      } else {
        console.error(`printer data for ${fileData.fileName} has incorrect length`)
        ack(false);
      }
    })

  }

  private loadPDF(data: string): void {
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i);
    }
    const blob = new Blob([bytes], {type: 'application/pdf'});
    this._pdfUrl = URL.createObjectURL(blob);
    this._iframe.src = this._pdfUrl;
  }

  private initialiseReceiver(): void {
    this._iframe = document.createElement('iframe');
    this._iframe.style.display = 'none';
    document.body.appendChild(this._iframe);
    this._iframe.onload = () => {
      URL.revokeObjectURL(this._pdfUrl);

      setTimeout(() => {
        this._iframe.focus();
        this._iframe.contentWindow?.print();
      }, 1);
    };

  }

}
