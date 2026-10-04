'use client';

import { useState } from 'react';
import Link from 'next/link';
import { productConfig } from '@/config/product';

export function QueueSharing({ slug }: { slug: string }) {
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState('');
  const url = `${productConfig.siteUrl}/q/${slug}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage('Customer link copied.');
    } catch {
      setMessage('Select and copy the link below.');
    }
  }
  async function showQr() {
    try {
      const QRCode = await import('qrcode');
      setQr(await QRCode.toDataURL(url, { width: 240, margin: 2 }));
    } catch {
      setMessage(
        'The QR code could not be created. Use the customer link instead.',
      );
    }
  }
  return (
    <details className="queue-tools">
      <summary>Share queue & open display</summary>
      <div className="queue-tools-content">
        <p>Share this customer link or display its QR code at your venue.</p>
        <input
          className="text-input"
          aria-label="Customer queue link"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <div className="utility-actions">
          <button
            className="button button-secondary"
            onClick={() => void copy()}
          >
            Copy customer link
          </button>
          <button
            className="button button-secondary"
            onClick={() => void showQr()}
          >
            Show QR code
          </button>
          <Link
            className="button button-secondary"
            href={`/q/${slug}/display`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open display ↗
          </Link>
        </div>
        {qr && (
          <figure className="queue-qr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR code to join this queue"
              width={240}
              height={240}
            />
            <figcaption>Scan to join the queue</figcaption>
          </figure>
        )}
        <p role="status">{message}</p>
      </div>
    </details>
  );
}
