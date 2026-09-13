// Lazy-loaded market dashboard derived from the complete cached listings dataset.
import { useMemo } from 'react';
import { StatusMessage } from '../components/StatusMessage';
import { useListings } from '../hooks/useListings';
import { areaSqft, listingPrice, median, money, titleCase } from '../lib/format';

// Build detailed, auditable market metrics because the advertised analytics endpoint is absent.
export default function InsightsView() {
  const { items, state } = useListings();
  const metrics = useMemo(() => {
    const live = items.filter((item) => item.is_live && listingPrice(item) > 0 && item.carpet_area > 0);
    const prices = live.map(listingPrice);
    const perSqft = live.map((item) => listingPrice(item) / areaSqft(item.carpet_area));
    const localities = Object.entries(live.reduce((groups, item) => { (groups[item.locality] ||= []).push(item); return groups; }, {}))
      .map(([locality, records]) => ({ locality, count: records.length, medianPrice: median(records.map(listingPrice)), medianPsf: median(records.map((item) => listingPrice(item) / areaSqft(item.carpet_area))) }))
      .sort((a, b) => b.count - a.count).slice(0, 6);
    const bedroom = [1, 2, 3, 4, 5].map((value) => ({ value, count: live.filter((item) => item.bedroom === value).length, medianPrice: median(live.filter((item) => item.bedroom === value).map(listingPrice)) })).filter((item) => item.count);
    const priceBands = [[0, 7500000, 'Under ₹75L'], [7500000, 12500000, '₹75L–₹1.25Cr'], [12500000, 20000000, '₹1.25Cr–₹2Cr'], [20000000, Infinity, 'Above ₹2Cr']].map(([min, max, label]) => ({ label, count: live.filter((item) => listingPrice(item) >= min && listingPrice(item) < max).length }));
    const invalid = items.filter((item) => item.price <= 0 || item.carpet_area > item.super_built_up_area || item.floor > item.total_floors || (item.property_type !== 'plot' && item.bedroom < 1)).length;
    return { live, prices, perSqft, localities, bedroom, priceBands, invalid };
  }, [items]);
  if (state === 'loading') return <section><p className="eyebrow">MARKET INTELLIGENCE</p><h1>Transparent by design.</h1><StatusMessage>Calculating market insights…</StatusMessage></section>;
  return <section><p className="eyebrow">MARKET INTELLIGENCE</p><h1>Transparent by design.</h1><p className="insight">All figures are calculated from retrievable listings. Areas are normalized into square feet and non-standard price values are corrected before analysis.</p>
    <div className="facts"><span>{items.length.toLocaleString('en-IN')} records</span><span>{metrics.live.length.toLocaleString('en-IN')} live homes</span><span>Median {money(median(metrics.prices))}</span><span>Median {money(median(metrics.perSqft))}/sq ft</span></div>
    <div className="insights-grid"><article className="insight-panel"><h2>Most active localities</h2>{metrics.localities.map((item) => <div className="metric-row" key={item.locality}><span>{titleCase(item.locality)}</span><strong>{item.count} homes<br />{money(item.medianPrice)} median</strong></div>)}</article>
      <article className="insight-panel"><h2>Price distribution</h2>{metrics.priceBands.map((item) => <div className="metric-row" key={item.label}><span>{item.label}</span><strong>{item.count} homes</strong></div>)}</article>
      <article className="insight-panel"><h2>Homes by size</h2>{metrics.bedroom.map((item) => <div className="metric-row" key={item.value}><span>{item.value} BHK</span><strong>{item.count} · {money(item.medianPrice)}</strong></div>)}</article>
      <article className="insight-panel"><h2>Price per sq ft</h2>{metrics.localities.slice(0, 4).map((item) => <div className="metric-row" key={item.locality}><span>{titleCase(item.locality)}</span><strong>{money(item.medianPsf)}/sq ft</strong></div>)}</article>
      <article className="insight-panel"><h2>Data quality</h2><p>{items.length - metrics.live.length} inactive records and {metrics.invalid} impossible records were found in the raw response.</p><p className="muted">Those records are visible for transparency but should not guide a purchase decision.</p></article>
      <article className="insight-panel"><h2>How to use this</h2><p>Start with a locality and BHK on Browse, then use price filters. Text and price input is debounced to keep the interface smooth while you type.</p></article></div>
  </section>;
}
