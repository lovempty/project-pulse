import { Icon } from "./glyph";

export function CardTitle({ title, subtitle, action, onClick }: { title: string; subtitle?: string; action: string; onClick: () => void }) {
  return (
    <div className="card-title">
      <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <button onClick={onClick}>{action}<Icon name="arrow" size={14}/></button>
    </div>
  );
}
