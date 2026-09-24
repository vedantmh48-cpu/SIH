/**
 * OrbitIQ brand mark.
 *
 * Renders the real ``public/logo.png`` lockup — used on the login and account
 * creation pages (via AuthLayout), on the session-restore splash and in the
 * app sidebar. When ``withText={false}`` (tight/collapsed layouts) the wide
 * banner is centre-cropped into a square emblem.
 */
export default function Logo({ size = 40, withText = true, className = "" }) {
  const emblem = !withText;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {emblem ? (
        <img
          src="/logo.png"
          alt="OrbitIQ"
          title="OrbitIQ"
          className="rounded-full border border-space-600/60 object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <img
          src="/logo.png"
          alt="OrbitIQ — Satellite Intelligence"
          title="OrbitIQ"
          className="rounded-lg border border-space-700/50 object-contain"
          style={{ width: Math.round(size * 2.6), height: size }}
        />
      )}
    </div>
  );
}