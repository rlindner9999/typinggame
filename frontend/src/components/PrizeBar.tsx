'use client';

type PrizeBarProps = {
  fee: string | null;
  pool: string | null;
  balance: string | null;
  feeLabel?: string;
  balanceLabel?: string;
};

export function PrizeBar({ fee, pool, balance, feeLabel = 'Entry Fee', balanceLabel = 'Your ETH' }: PrizeBarProps) {
  return (
    <div className="prize-bar">
      <div className="prize-stat">
        <div className="prize-val">{fee ? `${fee} ETH` : '\u2014'}</div>
        <div className="prize-label">{feeLabel}</div>
      </div>
      <div className="prize-divider" />
      <div className="prize-stat">
        <div className="prize-val">{pool ? `${pool} ETH` : '0 ETH'}</div>
        <div className="prize-label">Prize Pool</div>
      </div>
      <div className="prize-divider" />
      <div className="prize-stat">
        <div className="prize-val">{balance ? `${balance} ETH` : '\u2014'}</div>
        <div className="prize-label">{balanceLabel}</div>
      </div>
    </div>
  );
}
