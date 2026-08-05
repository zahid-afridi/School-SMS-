"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useConnectWhatsAppMutation,
  useDisconnectWhatsAppMutation,
  useGetWhatsAppQRCodeQuery,
  useGetWhatsAppSessionStatusQuery,
  useReconnectWhatsAppMutation,
  useRequestWhatsAppPairingCodeMutation,
} from "@/redux/features/messages/messageApi";
import type { WhatsAppSessionStatus } from "@/redux/features/messages/messageTypes";
import PageLoader from "@/app/components/PageLoader";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaMobile,
  FaPhone,
  FaPlug,
  FaPowerOff,
  FaQrcode,
  FaSyncAlt,
  FaTimesCircle,
  FaWifi,
} from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<WhatsAppSessionStatus, string> = {
  created: "Created",
  initializing: "Initializing…",
  qr_ready: "Waiting for QR scan",
  authenticating: "Authenticating…",
  action_required: "Action Required",
  ready: "Connected",
  disconnected: "Disconnected",
  failed: "Failed",
  stopped: "Stopped",
};

function statusColors(status: WhatsAppSessionStatus) {
  switch (status) {
    case "ready":
      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "qr_ready":
    case "initializing":
    case "authenticating":
      return "text-amber-700 bg-amber-50 border-amber-200";
    case "failed":
      return "text-rose-700 bg-rose-50 border-rose-200";
    case "action_required":
      return "text-orange-700 bg-orange-50 border-orange-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
}

function StatusDot({ status }: { status: WhatsAppSessionStatus }) {
  const color =
    status === "ready"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-rose-500"
        : ["qr_ready", "initializing", "authenticating"].includes(status)
          ? "bg-amber-400"
          : "bg-slate-300";
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${color} ${
        ["initializing", "authenticating"].includes(status) ? "animate-pulse" : ""
      }`}
    />
  );
}

const isTransitioning = (s?: WhatsAppSessionStatus) =>
  s === "initializing" || s === "authenticating" || s === "qr_ready";

const needsQR = (s?: WhatsAppSessionStatus) => s === "qr_ready";

const isDisconnectedState = (s?: WhatsAppSessionStatus) =>
  !s || s === "disconnected" || s === "stopped" || s === "failed" || s === "created";

// ─── Page ─────────────────────────────────────────────────────────────────────

type LinkMode = "qr" | "phone";

export default function WhatsAppConnectionPage() {
  const [actionError, setActionError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<LinkMode>("qr");
  const [phoneInput, setPhoneInput] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // Status polling — fast while transitioning
  const { data: sessionInfo, isLoading, refetch: refetchStatus } =
    useGetWhatsAppSessionStatusQuery(undefined, {
      pollingInterval: isTransitioning(undefined) ? 4000 : 12000,
    });

  const status = sessionInfo?.status;
  const pollingMs = isTransitioning(status) ? 4000 : 12000;

  // QR polling — only when qr_ready
  const {
    data: qrData,
    isFetching: qrFetching,
    refetch: refetchQR,
  } = useGetWhatsAppQRCodeQuery(undefined, {
    skip: !needsQR(status),
    pollingInterval: needsQR(status) ? 20000 : 0,
  });

  const [connect, { isLoading: connecting }] = useConnectWhatsAppMutation();
  const [disconnect, { isLoading: disconnecting }] = useDisconnectWhatsAppMutation();
  const [reconnect, { isLoading: reconnecting }] = useReconnectWhatsAppMutation();
  const [requestPairingCode, { isLoading: pairingLoading }] =
    useRequestWhatsAppPairingCodeMutation();

  const anyLoading = connecting || disconnecting || reconnecting || pairingLoading;

  const doAction = useCallback(
    async (action: () => Promise<unknown>, label: string) => {
      setActionError(null);
      setPairingCode(null);
      try {
        await action();
        setTimeout(() => void refetchStatus(), 1500);
      } catch (err: unknown) {
        const msg =
          (err as { data?: { message?: string } })?.data?.message ??
          (err as Error)?.message ??
          `${label} failed`;
        setActionError(msg);
      }
    },
    [refetchStatus]
  );

  const handleRequestPairingCode = async () => {
    const cleaned = phoneInput.replace(/\D/g, "");
    if (!cleaned) {
      setActionError("Enter a valid phone number");
      return;
    }
    setActionError(null);
    setPairingCode(null);
    try {
      const result = await requestPairingCode({ phoneNumber: cleaned }).unwrap();
      setPairingCode(result.pairingCode);
    } catch (err: unknown) {
      setActionError(
        (err as { data?: { message?: string } })?.data?.message ??
          "Failed to generate pairing code"
      );
    }
  };

  // Auto-refresh QR every 19 s when qr_ready
  const qrTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (needsQR(status)) {
      qrTimer.current = setInterval(() => void refetchQR(), 19000);
    }
    return () => {
      if (qrTimer.current) clearInterval(qrTimer.current);
    };
  }, [status, refetchQR]);

  // Clear pairing code when session becomes ready or status changes away from qr_ready
  useEffect(() => {
    if (status !== "qr_ready") setPairingCode(null);
  }, [status]);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <PageLoader compact label="Loading WhatsApp status" />
      </div>
    );
  }

  const isReady = status === "ready";
  const isDisconnected = isDisconnectedState(status);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full min-w-0">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 mb-1.5">
            WhatsApp Connection
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Manage Connection</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Each school has its own independent WhatsApp session.
          </p>
        </div>

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Session Status</h2>
            <button
              onClick={() => void refetchStatus()}
              className="text-slate-400 hover:text-sky-600 transition-colors"
              title="Refresh"
            >
              <FaSyncAlt size={13} />
            </button>
          </div>

          {/* Status badge */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold mb-4 ${statusColors(
              status ?? "disconnected"
            )}`}
          >
            <StatusDot status={status ?? "disconnected"} />
            {STATUS_LABEL[status ?? "disconnected"]}
          </div>

          {/* Session details */}
          {sessionInfo && (sessionInfo.phone || sessionInfo.pushName || sessionInfo.connectedAt) && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm mt-1">
              {sessionInfo.pushName && (
                <>
                  <dt className="text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                    <FaWifi size={11} /> Account
                  </dt>
                  <dd className="font-semibold text-slate-800">{sessionInfo.pushName}</dd>
                </>
              )}
              {sessionInfo.phone && (
                <>
                  <dt className="text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
                    <FaMobile size={11} /> Phone
                  </dt>
                  <dd className="font-mono text-slate-700">{sessionInfo.phone}</dd>
                </>
              )}
              {sessionInfo.connectedAt && (
                <>
                  <dt className="text-slate-500 whitespace-nowrap">Connected</dt>
                  <dd className="text-slate-600">
                    {new Date(sessionInfo.connectedAt).toLocaleString()}
                  </dd>
                </>
              )}
            </dl>
          )}

          {/* Session error */}
          {sessionInfo?.lastError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              <span className="font-semibold">Error: </span>
              {sessionInfo.lastError}
            </div>
          )}
        </div>

        {/* Action error */}
        {actionError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2 items-start">
            <FaTimesCircle className="mt-0.5 shrink-0 text-rose-400" />
            {actionError}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2.5">
          {isDisconnected && (
            <button
              onClick={() => doAction(() => connect().unwrap(), "Connect")}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {connecting ? <FaSyncAlt className="animate-spin" size={13} /> : <FaPlug size={13} />}
              Connect WhatsApp
            </button>
          )}

          {isReady && (
            <button
              onClick={() => doAction(() => disconnect().unwrap(), "Disconnect")}
              disabled={anyLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors"
            >
              {disconnecting ? (
                <FaSyncAlt className="animate-spin" size={13} />
              ) : (
                <FaPowerOff size={13} />
              )}
              Disconnect
            </button>
          )}

          <button
            onClick={() => doAction(() => reconnect().unwrap(), "Reconnect")}
            disabled={anyLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 transition-colors"
          >
            {reconnecting ? (
              <FaSyncAlt className="animate-spin" size={13} />
            ) : (
              <FaSyncAlt size={13} />
            )}
            Reconnect
          </button>
        </div>

        {/* QR / Pairing panel — shown when session is started and waiting for auth */}
        {needsQR(status) && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            {/* Tab switcher */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setLinkMode("qr")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  linkMode === "qr"
                    ? "text-sky-700 border-b-2 border-sky-600 bg-sky-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <FaQrcode size={13} /> Scan QR Code
              </button>
              <button
                onClick={() => setLinkMode("phone")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
                  linkMode === "phone"
                    ? "text-sky-700 border-b-2 border-sky-600 bg-sky-50/50"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <FaPhone size={12} /> Link by Phone
              </button>
            </div>

            <div className="p-5">
              {linkMode === "qr" ? (
                /* ── QR mode ─────────────────────────────────── */
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-slate-600">
                      Open WhatsApp → <span className="font-semibold">Linked Devices</span> → Link a Device
                    </p>
                    <button
                      onClick={() => void refetchQR()}
                      disabled={qrFetching}
                      title="Refresh QR"
                      className="text-slate-400 hover:text-sky-600 disabled:opacity-50 transition-colors"
                    >
                      <FaSyncAlt size={13} className={qrFetching ? "animate-spin" : ""} />
                    </button>
                  </div>

                  {qrData?.qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrData.qrCode}
                      alt="WhatsApp QR Code"
                      className="mx-auto block w-60 h-60 rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-60 rounded-xl border border-dashed border-amber-300 bg-amber-50/60">
                      {qrFetching ? (
                        <PageLoader compact label="Generating QR…" />
                      ) : (
                        <p className="text-amber-700 text-sm">Click refresh to load QR</p>
                      )}
                    </div>
                  )}

                  <p className="text-center text-xs text-slate-400 mt-2.5">
                    QR refreshes automatically every 20 seconds
                  </p>
                </div>
              ) : (
                /* ── Phone / pairing code mode ───────────────── */
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Enter your WhatsApp phone number. We'll generate an 8-digit pairing code
                    to link your account without scanning a QR.
                  </p>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FaPhone
                        size={12}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. 923335789091"
                        className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-sky-400 bg-slate-50"
                      />
                    </div>
                    <button
                      onClick={handleRequestPairingCode}
                      disabled={pairingLoading || !phoneInput.trim()}
                      className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                      {pairingLoading ? (
                        <FaSyncAlt className="animate-spin" size={13} />
                      ) : (
                        "Get Code"
                      )}
                    </button>
                  </div>

                  {pairingCode && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <p className="text-xs text-emerald-700 font-medium mb-1">Your pairing code</p>
                      <p className="text-3xl font-mono font-bold text-emerald-800 tracking-[0.3em]">
                        {pairingCode}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1.5">
                        Enter this code in WhatsApp → Linked Devices → Link with phone number
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Connected success banner */}
        {isReady && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 flex items-start gap-3">
            <FaCheckCircle className="text-emerald-500 mt-0.5 shrink-0" size={17} />
            <div>
              <p className="font-semibold text-emerald-800 text-sm">WhatsApp is connected</p>
              <p className="text-sm text-emerald-700 mt-0.5">
                Messages from your school will now be delivered via WhatsApp.
              </p>
            </div>
          </div>
        )}

        {/* Not configured warning */}
        {!isLoading && !sessionInfo && (
          <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 flex items-start gap-3">
            <FaExclamationTriangle className="text-amber-500 mt-0.5 shrink-0" size={16} />
            <div>
              <p className="font-semibold text-amber-800 text-sm">OpenWA not reachable</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Make sure OpenWA is running and <code className="font-mono">OPENWA_URL</code> /
                <code className="font-mono"> OPENWA_API_KEY</code> are set in the backend .env.
              </p>
            </div>
          </div>
        )}

        {/* Polling notice */}
        {isTransitioning(status) && (
          <p className="text-center text-xs text-slate-400">
            Status refreshes automatically every {pollingMs / 1000} seconds…
          </p>
        )}
      </div>
    </div>
  );
}
