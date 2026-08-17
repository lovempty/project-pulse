export function AvatarStack({ people }: { people: string[] }) {
  return (
    <div className="avatars">
      {people.map((person, index) => (
        <span key={`${person}-${index}`} style={{ zIndex: people.length - index }}>
          {person}
        </span>
      ))}
    </div>
  );
}
