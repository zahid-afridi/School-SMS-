"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import PageLoader from "@/app/components/PageLoader";
import {
  useConnectWhatsAppMutation,
  useDisconnectWhatsAppMutation,
  useGetWhatsAppConfigQuery,
  useGetWhatsAppQRCodeQuery,
  useGetWhatsAppSessionStatusQuery,
  useLogoutWhatsAppMutation,
  useReconnectWhatsAppMutation,
  useRequestWhatsAppPairingCodeMutation,
  useSaveWhatsAppConfigMutation,
} from "@/redux/features/messages/messageApi";
import type { WhatsAppSessionStatus } from "@/redux/features/messages/messageTypes";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaKey,
  FaMobile,
  FaPhone,
  FaPlug,
  FaPowerOff,
  FaQrcode,
  FaSignOutAlt,
  FaSyncAlt,
  FaTimesCircle,
  FaWifi,
} from "react-icons/fa";

const STATUS_LABEL: Record<WhatsAppSessionStatus, string> = {
  created: "Not connected",
  initializing: "Starting…",
  qr_ready: "Scan QR code",
  authenticating: "Confirming…",
  action_required: "Action required",
  ready: "Connected",
  disconnected: "Disconnected",
  failed: "Failed",
  stopped: "Disconnected",
};

function statusTone(status: WhatsAppSessionStatus) {
  if (status === "ready") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "failed") return "text-rose-700 bg-rose-50 border-rose-200";
  if (["qr_ready", "initializing", "authenticating"].includes(status)) {
    return "text-amber-700 bg-amber-50 border-amber-200";
  }
  return "text-slate-600 bg-slate-50 border-slate-200";
}

const isBusy = (s?: WhatsAppSessionStatus) =>
  s === "initializing" || s === "authenticating" || s === "qr_ready";

const needsQR = (s?: WhatsAppSessionStatus) => s === "qr_ready";

const isOffline = (s?: WhatsAppSessionStatus) =>
  !s || ["disconnected", "stopped", "failed", "created"].includes(s);

function errMessage(err: unknown, fallback: string) {
  return (
    (err as { data?: { message?: string } })?.data?.message ??
    (err as Error)?.message ??
    fallback
  );
}

/**
 * School-owner WhatsApp setup:
 * 1) Gateway is usually set once in backend .env (Electron/offline install).
 * 2) New school only clicks Connect → scans QR (or pairing code).
 * Advanced gateway form is hidden unless gateway is missing.
 */
export default function WhatsAppConnectionPage() {
  const [error, setError] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState<"qr" | "phone">("qr");
  const [phoneInput, setPhoneInput] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gatewayUrl, setGatewayUrl] = useState("http://localhost:2785");
  const [gatewayApiKey, setGatewayApiKey] = useState("");
  const [statusHint, setStatusHint] = useState<WhatsAppSessionStatus>();

  const { data: config, isLoading: configLoading, refetch: refetchConfig } =
    useGetWhatsAppConfigQuery();

  const gatewayReady = Boolean(config?.gatewayConfigured);

  const {
    data: session,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useGetWhatsAppSessionStatusQuery(undefined, {
    skip: !gatewayReady,
    pollingInterval: isBusy(statusHint) ? 4000 : 12000,
  });

  const status = session?.status;
  useEffect(() => setStatusHint(status), [status]);

  const {
    data: qrData,
    isFetching: qrFetching,
    refetch: refetchQR,
  } = useGetWhatsAppQRCodeQuery(undefined, {
    skip: !gatewayReady || !needsQR(status),
    pollingInterval: needsQR(status) ? 20000 : 0,
  });

  const [connect, { isLoading: connecting }] = useConnectWhatsAppMutation();
  const [disconnect, { isLoading: disconnecting }] = useDisconnectWhatsAppMutation();
  const [reconnect, { isLoading: reconnecting }] = useReconnectWhatsAppMutation();
  const [logout, { isLoading: loggingOut }] = useLogoutWhatsAppMutation();
  const [requestPairing, { isLoading: pairingLoading }] =
    useRequestWhatsAppPairingCodeMutation();
  const [saveConfig, { isLoading: saving }] = useSaveWhatsAppConfigMutation();

  const busy =
    connecting || disconnecting || reconnecting || pairingLoading || loggingOut || saving;

  useEffect(() => {
    if (!config) return;
    if (config.gatewayUrl) setGatewayUrl(config.gatewayUrl);
    setShowAdvanced(!config.gatewayConfigured);
  }, [config]);

  useEffect(() => {
    if (status !== "qr_ready") setPairingCode(null);
  }, [status]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, label: string) => {
      setError(null);
      try {
        await fn();
        setTimeout(() => void refetchStatus(), 1000);
      } catch (err) {
        setError(errMessage(err, `${label} failed`));
      }
    },
    [refetchStatus]
  );

  const saveGateway = async () => {
    setError(null);
    if (!gatewayUrl.trim()) {
      setError("OpenWA URL is required");
      return;
    }
    if (!gatewayApiKey.trim() && !config?.hasApiKey) {
      setError("API key is required");
      return;
    }
    try {
      await saveConfig({
        gatewayUrl: gatewayUrl.trim(),
        gatewayApiKey: gatewayApiKey.trim() || undefined,
      }).unwrap();
      setGatewayApiKey("");
      toast.success("Saved");
      setShowAdvanced(false);
      void refetchConfig();
    } catch (err) {
      setError(errMessage(err, "Could not save settings"));
    }
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <PageLoader compact label="Loading WhatsApp" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 mb-1.5">
            Messages
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Connect WhatsApp</h1>
          <p className="text-slate-500 mt-1 text-sm">
            Link this school’s WhatsApp number. New schools only need to scan the QR code once.
          </p>
        </div>

        {!gatewayReady && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex gap-3">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">WhatsApp service not ready</p>
              <p className="mt-1">
                Start OpenWA on this PC, then enter the API key below (or set{" "}
                <code className="font-mono">OPENWA_URL</code> /{" "}
                <code className="font-mono">OPENWA_API_KEY</code> in the backend .env for
                offline builds).
              </p>
            </div>
          </div>
        )}

        {/* Advanced / first-time gateway — only when needed */}
        {(showAdvanced || !gatewayReady) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h2 className="font-semibold text-slate-800 text-sm">Service settings</h2>
            <input
              value={gatewayUrl}
              onChange={(e) => setGatewayUrl(e.target.value)}
              placeholder="http://localhost:2785"
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
            />
            <div className="relative">
              <FaKey
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                value={gatewayApiKey}
                onChange={(e) => setGatewayApiKey(e.target.value)}
                placeholder={
                  config?.hasApiKey ? "Leave blank to keep current key" : "owa_k1_…"
                }
                className="w-full h-11 rounded-xl border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={() => void saveGateway()}
              disabled={saving}
              className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & continue"}
            </button>
          </div>
        )}

        {gatewayReady && !showAdvanced && (
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="text-xs text-slate-400 hover:text-slate-600"
          >
            Advanced service settings
          </button>
        )}

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2">
            <FaTimesCircle className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {gatewayReady && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FaWifi className="text-slate-500" /> Status
              </h2>
              <button
                type="button"
                onClick={() => void refetchStatus()}
                className="text-slate-400 hover:text-sky-600"
                title="Refresh"
              >
                <FaSyncAlt size={13} />
              </button>
            </div>

            {statusLoading && !session ? (
              <PageLoader compact label="Checking…" />
            ) : statusError && !session ? (
              <p className="text-sm text-rose-700">
                Cannot reach WhatsApp service. Make sure OpenWA is running on{" "}
                {config?.gatewayUrl || "localhost:2785"}.
              </p>
            ) : (
              <>
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-semibold ${statusTone(
                    status ?? "disconnected"
                  )}`}
                >
                  {STATUS_LABEL[status ?? "disconnected"]}
                </div>

                {(session?.phone || session?.pushName) && (
                  <div className="text-sm text-slate-600 space-y-1">
                    {session.pushName && (
                      <p>
                        <span className="text-slate-400">Account:</span>{" "}
                        <span className="font-semibold text-slate-800">
                          {session.pushName}
                        </span>
                      </p>
                    )}
                    {session.phone && (
                      <p className="flex items-center gap-1.5">
                        <FaMobile size={11} className="text-slate-400" />
                        <span className="font-mono">{session.phone}</span>
                      </p>
                    )}
                  </div>
                )}

                {session?.lastError && (
                  <p className="text-sm text-rose-700">{session.lastError}</p>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2">
              {isOffline(status) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => connect().unwrap(), "Connect")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {connecting ? (
                    <FaSyncAlt className="animate-spin" size={13} />
                  ) : (
                    <FaPlug size={13} />
                  )}
                  Connect WhatsApp
                </button>
              )}

              {status === "ready" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => disconnect().unwrap(), "Disconnect")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                >
                  {disconnecting ? (
                    <FaSyncAlt className="animate-spin" size={13} />
                  ) : (
                    <FaPowerOff size={13} />
                  )}
                  Disconnect
                </button>
              )}

              {!isOffline(status) && status !== "ready" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => reconnect().unwrap(), "Reconnect")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
                >
                  {reconnecting ? (
                    <FaSyncAlt className="animate-spin" size={13} />
                  ) : (
                    <FaSyncAlt size={13} />
                  )}
                  Retry
                </button>
              )}

              {(status === "ready" || needsQR(status)) && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await logout().unwrap();
                      toast.success("WhatsApp unlinked");
                    }, "Unlink")
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-60"
                >
                  <FaSignOutAlt size={12} />
                  Change number
                </button>
              )}
            </div>
          </div>
        )}

        {gatewayReady && needsQR(status) && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setLinkMode("qr")}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
                  linkMode === "qr"
                    ? "text-sky-700 border-b-2 border-sky-600 bg-sky-50/50"
                    : "text-slate-500"
                }`}
              >
                <FaQrcode size={13} /> Scan QR
              </button>
              <button
                type="button"
                onClick={() => setLinkMode("phone")}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
                  linkMode === "phone"
                    ? "text-sky-700 border-b-2 border-sky-600 bg-sky-50/50"
                    : "text-slate-500"
                }`}
              >
                <FaPhone size={12} /> Phone code
              </button>
            </div>

            <div className="p-5">
              {linkMode === "qr" ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 text-center">
                    On your phone: WhatsApp → <strong>Linked devices</strong> → Link a device
                  </p>
                  {qrData?.qrCode ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrData.qrCode}
                      alt="WhatsApp QR"
                      className="mx-auto w-56 h-56 rounded-xl border border-slate-200"
                    />
                  ) : (
                    <div className="h-56 flex items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/50">
                      {qrFetching ? (
                        <PageLoader compact label="Loading QR…" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => void refetchQR()}
                          className="text-sm font-semibold text-sky-700"
                        >
                          Load QR code
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Enter number with country code (example:{" "}
                    <code className="font-mono">923001234567</code>)
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className="flex-1 h-10 rounded-xl border border-slate-200 px-3 text-sm"
                      placeholder="923001234567"
                    />
                    <button
                      type="button"
                      disabled={pairingLoading || !phoneInput.trim()}
                      onClick={async () => {
                        setError(null);
                        try {
                          const r = await requestPairing({
                            phoneNumber: phoneInput.replace(/\D/g, ""),
                          }).unwrap();
                          setPairingCode(r.pairingCode);
                        } catch (err) {
                          setError(errMessage(err, "Could not get code"));
                        }
                      }}
                      className="px-4 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      Get code
                    </button>
                  </div>
                  {pairingCode && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
                      <p className="text-3xl font-mono font-bold tracking-[0.25em] text-emerald-800">
                        {pairingCode}
                      </p>
                      <p className="text-xs text-emerald-700 mt-2">
                        Enter this in WhatsApp → Link with phone number
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 text-sm text-emerald-800">
            <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-semibold">Ready to send messages</p>
              <p className="mt-0.5">
                Use Messages → Send Message, Attendance, Fees, and more.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
