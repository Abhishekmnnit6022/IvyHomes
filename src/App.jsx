import { useEffect, useMemo, useState } from 'react';

import { api, clearSession, getAll, getSession, login } from './api';
import { ListingCard } from './components/ListingCard';
import { StatusMessage } from './components/StatusMessage';
import { useListings } from './hooks/useListings';
import { areaSqft, listingPrice, median, money, projectPrice, titleCase } from './lib/format';

// Auth screen used until a valid API session is stored locally.
function Login({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault(); setError('');
    try { await login(email.trim(), password); onAuthenticated(); }
    catch (requestError) { setError(requestError.message); }
  }

  return <main className="login"><section>
    <p className="eyebrow">IVY / HYDERABAD</p><h1>Property, without the noise.</h1>
    <p>Browse market data, save homes, and see transparent price insights.</p>
    <form onSubmit={submit}><label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="demo1@ivy.homes" autoComplete="off" required /></label>
      <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" autoComplete="new-password" required /></label>
      {error && <StatusMessage type="error">{error}</StatusMessage>}<button>Sign in</button></form>
  </section></main>;
}

// Simple hash-navigation header keeps listing detail links shareable.
function Header({ view, changeView, savedCount, signOut }) {
  return <header><button className="logo" onClick={() => changeView('browse')}>IVY<span>.</span></button>
    <nav>{[['browse', 'Browse'], ['market', 'Rentals & projects'], ['insights', 'Insights'], ['saved', `Saved${savedCount ? ` (${savedCount})` : ''}`]].map(([id, label]) =>
      <button className={view === id ? 'nav-active' : ''} onClick={() => changeView(id)} key={id}>{label}</button>)}</nav>
    <button className="logout" onClick={signOut}>Sign out</button></header>;
}

// Filters run locally after the complete collection is cached for instant feedback.
function Browse({ savedIds, onSave, onOpen, onlySaved = false }) {
  const { items, state, error } = useListings();
  const [filters, setFilters] = useState({ locality: '', bedroom: '', furnishing: '', min: '', max: '' });
  const [page, setPage] = useState(0);
  const localities = useMemo(() => [...new Set(items.map((item) => item.locality))].sort(), [items]);
  const visible = useMemo(() => items.filter((item) =>
    (!onlySaved || savedIds.has(item.listing_id)) &&
    (!filters.locality || item.locality === filters.locality) &&
    (!filters.bedroom || item.bedroom === Number(filters.bedroom)) &&
    (!filters.furnishing || item.furnishing === filters.furnishing) &&
    (!filters.min || listingPrice(item) >= Number(filters.min)) &&
    (!filters.max || listingPrice(item) <= Number(filters.max))), [items, filters, onlySaved, savedIds]);
  const perPage = 24; const pageCount = Math.max(1, Math.ceil(visible.length / perPage));
  const pageItems = visible.slice(page * perPage, (page + 1) * perPage);
  const updateFilter = (key, value) => { setFilters((previous) => ({ ...previous, [key]: value })); setPage(0); };

  return <section><div className="hero"><p className="eyebrow">{onlySaved ? 'YOUR SHORTLIST' : 'LIVE MARKET EXPLORER'}</p>
    <h1>{onlySaved ? 'Saved homes.' : 'Find your next home.'}</h1>
    <p>{state === 'loading' ? 'Loading market inventory…' : `${items.length.toLocaleString('en-IN')} retrievable records${state === 'updating' ? ' · indexing the rest in the background…' : ''}`}</p></div>
    {!onlySaved && <div className="filters"><select value={filters.locality} onChange={(e) => updateFilter('locality', e.target.value)}><option value="">All localities</option>{localities.map((value) => <option key={value}>{value}</option>)}</select>
      <select value={filters.bedroom} onChange={(e) => updateFilter('bedroom', e.target.value)}><option value="">Any bedrooms</option>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} BHK</option>)}</select>
      <select value={filters.furnishing} onChange={(e) => updateFilter('furnishing', e.target.value)}><option value="">Any furnishing</option>{['unfurnished', 'semi-furnished', 'fully-furnished'].map((value) => <option key={value}>{value}</option>)}</select>
      <input type="number" placeholder="Minimum price" value={filters.min} onChange={(e) => updateFilter('min', e.target.value)} /><input type="number" placeholder="Maximum price" value={filters.max} onChange={(e) => updateFilter('max', e.target.value)} /></div>}
    {error ? <StatusMessage type="error">{error}</StatusMessage> : <><p className="result-count">{visible.length} matches · page {page + 1} of {pageCount}. Prices and areas are normalized before filtering.</p>
      <div className="grid">{pageItems.map((item) => <ListingCard key={item.listing_id} listing={item} isSaved={savedIds.has(item.listing_id)} onSave={onSave} onOpen={onOpen} />)}</div>
      {!pageItems.length && state !== 'loading' && <StatusMessage>{onlySaved ? 'No saved listings yet.' : 'No listings match these filters. Try clearing one filter.'}</StatusMessage>}
      <div className="pager"><button disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><button disabled={page + 1 >= pageCount} onClick={() => setPage(page + 1)}>Next</button></div></>}
  </section>;
}

// Loads a single authoritative detail record when its URL is opened.
function Detail({ listingId, savedIds, onSave, onBack }) {
  const [listing, setListing] = useState(); const [error, setError] = useState('');
  useEffect(() => { api(`/v1/listings/${listingId}`).then(setListing).catch((e) => setError(e.message)); }, [listingId]);
  if (error) return <StatusMessage type="error">{error}</StatusMessage>;
  if (!listing) return <StatusMessage>Loading listing…</StatusMessage>;
  return <section className="detail"><button className="text-button" onClick={onBack}>← Back to browse</button><p className="eyebrow">{titleCase(listing.locality)} · {listing.listing_id}</p><h1>{listing.apartment_name}</h1><h2>{money(listingPrice(listing))}</h2>
    <button className="primary" onClick={() => onSave(listingId)}>{savedIds.has(listingId) ? 'Remove saved listing' : 'Save listing'}</button>
    <div className="facts"><span>{listing.bedroom} bedrooms</span><span>{listing.bathroom} bathrooms</span><span>{areaSqft(listing.carpet_area).toLocaleString('en-IN')} sq ft carpet</span><span>{listing.floor}/{listing.total_floors} floor</span></div><p>{listing.description}</p></section>;
}

// The rentals/projects view reuses collection pagination for either catalog.
function Market() {
  const [tab, setTab] = useState('rentals'); const [items, setItems] = useState([]); const [error, setError] = useState('');
  useEffect(() => { setItems([]); getAll(`/v1/${tab}`).then(setItems).catch((e) => setError(e.message)); }, [tab]);
  return <section><div className="tabs"><button className={tab === 'rentals' ? 'active' : ''} onClick={() => setTab('rentals')}>Rentals</button><button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>Projects</button></div>
    {error ? <StatusMessage type="error">{error}</StatusMessage> : <div className="grid">{items.map((item) => tab === 'rentals' ? <article className="card" key={item.listing_id}><span>{titleCase(item.locality)}</span><h3>{item.apartment_name}</h3><p>{item.bedroom} BHK · {item.furnishing}</p><strong>{money(item.price)} / month</strong><p className="muted">{areaSqft(item.carpet_area).toLocaleString('en-IN')} sq ft carpet</p></article> : <article className="card" key={item.project_id}><span>{titleCase(item.locality)}</span><h3>{item.apartment_name}</h3><p>{titleCase(item.project_status)}</p><strong>{money(projectPrice(item.price_min))} – {money(projectPrice(item.price_max))}</strong><p className="muted">{item.min_area_sqft?.toLocaleString('en-IN')}–{item.max_area_sqft?.toLocaleString('en-IN')} sq ft</p></article>)}</div>}
  </section>;
}

// The server analytics route is absent, so insights derive from loaded listings.
function Insights() {
  const { items, state } = useListings();
  const live = items.filter((item) => item.is_live && listingPrice(item) > 0);
  const prices = live.map(listingPrice);
  const localities = new Set(items.map((item) => item.locality)).size;
  // Group live inventory so the dashboard does not depend on the missing analytics API.
  const byLocality = Object.entries(live.reduce((groups, item) => {
    (groups[item.locality] ||= []).push(item); return groups;
  }, {})).map(([locality, records]) => ({ locality, count: records.length, medianPrice: median(records.map(listingPrice)) })).sort((a, b) => b.count - a.count).slice(0, 6);
  const byBedroom = [1, 2, 3, 4, 5].map((bedroom) => ({ bedroom, count: live.filter((item) => item.bedroom === bedroom).length })).filter((item) => item.count);
  // These checks explain why the app normalizes and treats raw values cautiously.
  const invalid = items.filter((item) => item.price <= 0 || item.carpet_area > item.super_built_up_area || item.floor > item.total_floors || (item.property_type !== 'plot' && item.bedroom < 1)).length;
  const inactive = items.length - live.length;
  return <section><p className="eyebrow">MARKET INTELLIGENCE</p><h1>Transparent by design.</h1><p className="insight">The documented analytics API is unavailable, so this dashboard calculates every figure from retrievable listings. Area and project-price units are normalized before use.</p>
    {state === 'loading' ? <StatusMessage>Calculating market insights…</StatusMessage> : <><div className="facts"><span>{items.length.toLocaleString('en-IN')} records</span><span>{live.length.toLocaleString('en-IN')} live homes</span><span>{localities} localities</span><span>Median {money(median(prices))}</span></div>
      <div className="insights-grid"><article className="insight-panel"><h2>Most active localities</h2>{byLocality.map((item) => <div className="metric-row" key={item.locality}><span>{titleCase(item.locality)}</span><strong>{item.count} homes · {money(item.medianPrice)}</strong></div>)}</article>
        <article className="insight-panel"><h2>Live homes by size</h2>{byBedroom.map((item) => <div className="metric-row" key={item.bedroom}><span>{item.bedroom} BHK</span><strong>{item.count} homes</strong></div>)}</article>
        <article className="insight-panel"><h2>Data quality note</h2><p>{inactive.toLocaleString('en-IN')} records are not live and {invalid} have impossible cross-field values. They are displayed transparently but should not drive a buying decision.</p><p className="muted">Use the Browse filters to explore the corrected inventory.</p></article></div></>}
  </section>;
}

// Root controller for session state, saved homes, notices, and page routing.
export default function App() {
  const [session, setCurrentSession] = useState(getSession());
  const [route, setRoute] = useState(() => location.hash.replace('#', '') || 'browse');
  const [savedIds, setSavedIds] = useState(new Set()); const [notice, setNotice] = useState('');
  const view = route.startsWith('listing/') ? 'detail' : route;
  const changeView = (next) => { location.hash = next; setRoute(next); };

  useEffect(() => { const listen = () => setRoute(location.hash.replace('#', '') || 'browse'); addEventListener('hashchange', listen); return () => removeEventListener('hashchange', listen); }, []);
  // The live API uses /v1/saved, not the outdated documented /v1/favourites path.
  useEffect(() => { if (!session) return; api('/v1/saved').then((data) => setSavedIds(new Set((data.results || []).map((item) => item.listing_id)))).catch(() => { }); }, [session]);
  // Update server and UI together so saves remain available after a reload.
  async function toggleSaved(listingId) { try { if (savedIds.has(listingId)) { await api(`/v1/saved/${listingId}`, { method: 'DELETE' }); setSavedIds((old) => { const next = new Set(old); next.delete(listingId); return next; }); } else { await api('/v1/saved', { method: 'POST', body: JSON.stringify({ listing_id: listingId }) }); setSavedIds((old) => new Set(old).add(listingId)); } } catch (e) { setNotice(e.message); } }
  if (!session) return <Login onAuthenticated={() => setCurrentSession(getSession())} />;
  return <><Header view={view} changeView={changeView} savedCount={savedIds.size} signOut={() => { clearSession(); setCurrentSession(null); }} /><main className="app">{notice && <StatusMessage type="error">{notice}</StatusMessage>}{view === 'browse' && <Browse savedIds={savedIds} onSave={toggleSaved} onOpen={(id) => changeView(`listing/${id}`)} />}{view === 'saved' && <Browse savedIds={savedIds} onSave={toggleSaved} onOpen={(id) => changeView(`listing/${id}`)} onlySaved />}{view === 'detail' && <Detail listingId={route.split('/')[1]} savedIds={savedIds} onSave={toggleSaved} onBack={() => changeView('browse')} />}{view === 'market' && <Market />}{view === 'insights' && <Insights />}</main></>;
}