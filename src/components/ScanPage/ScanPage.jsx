import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./ScanPage.css";

// scanState is now supplied by App and passed as a prop.
import { SCAN_SLOTS } from "../../data/scanSlots";

import {
  isImageFile,
  formatBytes,
  readImageDimensions,
  MAX_IMAGE_BYTES,
} from "../../utils/images";

function ScanSlot({
  slot,
  slotItems,
  addImage,
  removeImage,
}) {
  const inputRef = useRef(null);
  const [error, setError] = useState(null);

  const imageCount = slotItems?.length ?? 0;
  const isFull = imageCount >= slot.maxImages;

  async function handleFiles(files) {
    setError(null);

    if (!files || files.length === 0) {
      return;
    }

    let currentCount = imageCount;

    for (const file of files) {
      if (!isImageFile(file)) {
        setError("Selected file is not an image.");
        continue;
      }

      if (file.size > MAX_IMAGE_BYTES) {
        setError("Image exceeds maximum size of 15 MB.");
        continue;
      }

      if (currentCount >= slot.maxImages) {
        setError(
          `Maximum of ${slot.maxImages} images allowed for this territory.`
        );
        break;
      }

      // Read dimensions client-side if possible and then upload
      let dims = { width: null, height: null };
  try { dims = await readImageDimensions(file); } catch (e) { void e; }

      const meta = {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        width: dims.width,
        height: dims.height,
      };

      try {
        // addImage will upload and update shared scan state
        await addImage(slot.id, file, meta);
      } catch (e) {
        setError(e.message || 'Upload failed');
      }

      currentCount += 1;
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onChoose() {
    inputRef.current?.click();
  }

  return (
    <article className="scan-slot">
      <div className="scan-slot-header">
        <div>
          <p className="scan-slot-eyebrow">
            TERRITORY VIEW
          </p>

          <h2>{slot.label}</h2>
        </div>

        <div
          className={
            isFull
              ? "scan-count scan-count-full"
              : "scan-count"
          }
        >
          {imageCount} / {slot.maxImages}
        </div>
      </div>

      <p className="scan-slot-description">
        {slot.description}
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        hidden
        onChange={(event) =>
          handleFiles(event.target.files)
        }
      />

      {!isFull && (
        <button
          type="button"
          className="scan-upload-zone"
          onClick={onChoose}
        >
          <span className="scan-upload-icon">
            +
          </span>

          <span className="scan-upload-title">
            Add photos
          </span>

          <span className="scan-upload-hint">
            Take a photo or choose from your device
          </span>
        </button>
      )}

      {error && (
        <div className="slot-error">
          <span>!</span>
          {error}
        </div>
      )}

      {imageCount > 0 && (
        <div className="slot-previews">
          {slotItems.map((item) => (
            <div
              key={item.id}
              className="preview-card"
            >
              <div className="preview-image-wrap">
                <img
                  src={item.previewUrl}
                  alt={`${slot.label} upload preview`}
                />

                <button
                  type="button"
                  className="preview-remove"
                  aria-label={`Remove ${item.fileName}`}
                  onClick={() =>
                    removeImage(
                      slot.id,
                      item.id
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div className="preview-meta">
                <div className="meta-name">
                  {item.fileName}
                </div>

                <div className="meta-size">
                  {formatBytes(item.size)}

                  {item.width
                    ? ` · ${item.width}×${item.height}`
                    : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function ScanPage({ scanState }) {
  const {
    scan,
    addImage,
    removeImage,
    totalImages,
    clearScan,
  } = scanState;

  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  async function handleAnalyze() {
    setAnalysisError(null);
    if (!scanState || typeof scanState.runAnalysis !== 'function') {
      setAnalysisError('Analysis not available');
      return;
    }

    try {
      setAnalyzing(true);
      await scanState.runAnalysis();
      // After a successful analysis, navigate to Room Inspector to view reconciliation
      navigate('/dev#room-inspector');
    } catch (err) {
      setAnalysisError(err.message || String(err));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="scan-page">
      <header className="scan-hero">
        <div>
          <p className="eyebrow">
            TERRITORY SCAN
          </p>

          <h1>SCAN TERRITORY</h1>

          <p className="scan-subtitle">
            Verify the current state of the dungeon.
          </p>
        </div>

        <div className="scan-status">
          <div className="scan-status-number">
            {totalImages}
          </div>

          <div>
            <span>PHOTOS ATTACHED</span>
            <strong>
              {(scan && scan.status) ? String(scan.status).toUpperCase() : "DRAFT"}
            </strong>
          </div>
        </div>
      </header>

      <section className="scan-intro">
        <div className="scan-intro-icon">
          ◈
        </div>

        <div>
          <strong>
            Capture the room as it exists right now.
          </strong>

          <p>
            Multiple angles are useful. Photos are
            currently used as visual references while
            reconciling the room model manually.
          </p>
        </div>
      </section>

      <section className="scan-section">
        <div className="scan-section-heading">
          <p className="eyebrow">
            CAPTURE THE EVIDENCE
          </p>

          <h2>Required Views</h2>
        </div>

        <div className="scan-grid">
          {SCAN_SLOTS.map((slot) => (
            <ScanSlot
              key={slot.id}
              slot={slot}
              slotItems={
                // guard: scan or scan.slots may be null during initial state
                (scan && scan.slots && scan.slots[slot.id]) || []
              }
              addImage={addImage}
              removeImage={removeImage}
            />
          ))}
        </div>
      </section>

      <footer className="scan-footer">
        <div className="scan-timestamps">
          <div>
            <span>SCAN CREATED</span>
            <strong>
              {(scan && scan.createdAt) ? new Date(scan.createdAt).toLocaleString() : '—'}
            </strong>
          </div>

          <div>
            <span>LAST UPDATED</span>
            <strong>
              {(scan && scan.updatedAt) ? new Date(scan.updatedAt).toLocaleString() : '—'}
            </strong>
          </div>
        </div>

        <div className="scan-footer-actions">
          {totalImages > 0 && (
            <>
              <button
                type="button"
                className="scan-clear"
                onClick={clearScan}
              >
                Clear Scan
              </button>

              <button
                type="button"
                className="scan-analyze"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing…' : 'Analyze Scan'}
              </button>

              {analysisError && (
                <div className="scan-error">{analysisError}</div>
              )}
            </>
          )}

          <Link
            className="scan-continue"
            to="/dev#room-inspector"
          >
            Continue to Room Inspector
            <span>→</span>
          </Link>
        </div>
      </footer>

      <p className="scan-temporary-note">
        Scan photos are stored locally by the Room Raid development server.
      </p>
    </main>
  );
}