// Lazy-loaded rentals and projects catalog to keep the first page bundle small.
import { useEffect, useState } from 'react';
import { getAll } from '../api';
import { areaSqft, money, projectPrice, titleCase } from '../lib/format';
import { StatusMessage } from '../components/StatusMessage';

// Fetch and display a complete rental or project catalog only when this route opens.
export default function MarketView() {
  const [tab, setTab] = useState('rentals');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    setItems([]); setError('');
    getAll(`/v1/${tab}`).then(setItems).catch((requestError) => setError(requestError.message));
  }, [tab]);
  return <section><div className="tabs"><button className={tab === 'rentals' ? 'active' : ''} onClick={() => setTab('rentals')}>Rentals</button><button className={tab === 'projects' ? 'active' : ''} onClick={() => setTab('projects')}>Projects</button></div>
    {error ? <StatusMessage type="error">{error}</StatusMessage> : <div className="grid">{items.map((item) => tab === 'rentals' ? <article className="card" key={item.listing_id}><span>{titleCase(item.locality)}</span><h3>{item.apartment_name}</h3><p>{item.bedroom} BHK · {item.furnishing}</p><strong>{money(item.price)} / month</strong><p className="muted">{areaSqft(item.carpet_area).toLocaleString('en-IN')} sq ft carpet</p></article> : <article className="card" key={item.project_id}><span>{titleCase(item.locality)}</span><h3>{item.apartment_name}</h3><p>{titleCase(item.project_status)}</p><strong>{money(projectPrice(item.price_min))} – {money(projectPrice(item.price_max))}</strong><p className="muted">{item.min_area_sqft?.toLocaleString('en-IN')}–{item.max_area_sqft?.toLocaleString('en-IN')} sq ft</p></article>)}</div>}
  </section>;
}
