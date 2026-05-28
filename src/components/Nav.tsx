export default function Nav() {
  const handleJoinClick = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="top">
      <div className="mark" style={{ fontWeight: 500, fontSize: 20 }}>SEALED</div>
      <button
        type="button"
        className="join"
        onClick={handleJoinClick}
        style={{ fontWeight: 500, fontSize: 10 }}
      >
        Join Waitlist <span className="arrow">↑</span>
      </button>
    </nav>
  );
}
