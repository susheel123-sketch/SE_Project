import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <section className="hero">
      <h1>Broken phone or laptop? Don’t throw it away.</h1>
      <p className="lead">
        Revive connects you with verified repair shops near you. Post a repair request, get competing quotes,
        and track the job until your device is back in your hands.
      </p>
      <div className="hero-actions">
        <Link to="/signup" className="btn big">Get started</Link>
        <Link to="/login" className="btn ghost big">I already have an account</Link>
      </div>
      <div className="hero-cards">
        <div className="card"><h3>For device owners</h3><p>Describe the problem, add photos, and send it to shops you trust.</p></div>
        <div className="card"><h3>For repair shops</h3><p>List your services and prices and reach new customers online.</p></div>
        <div className="card"><h3>Less e-waste</h3><p>Every repaired or traded-in device is one less in a landfill.</p></div>
      </div>
    </section>
  );
}
