import { CheckCircle2, Heart, MapPin, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatNaira } from '../data/demo.js'

export function Logo({ light = false }) { return <Link className={`logo ${light ? 'logo-light' : ''}`} to="/" aria-label="BizZorix home"><span>Biz</span>Zorix<i /></Link> }
export function Verified() { return <span className="verified"><CheckCircle2 size={15} fill="currentColor" /> Verified</span> }
export function Rating({ value, count }) { return <span className="rating"><Star size={15} fill="currentColor" /> <b>{Number(value || 0).toFixed(1)}</b> <span>({count || 0})</span></span> }
export function BusinessCard({ business, saved, onSave }) {
  const rating = business.averageRating ?? business.rating, reviews = business.reviewCount ?? business.reviews
  return <article className="business-card">
    <div className="business-photo"><img src={business.coverImage || business.image} alt={`${business.name} storefront or work`} /><button className={`save ${saved ? 'saved' : ''}`} onClick={() => onSave?.(business)} aria-label={`Save ${business.name}`}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button><span className={`open-pill ${business.open === false ? 'closed' : ''}`}>{business.open === false ? 'Closed' : 'Open now'}</span></div>
    <div className="business-body"><div className="card-title-row"><h3>{business.name}</h3>{business.verified !== false && business.verificationStatus !== 'pending' && <Verified />}</div><p className="category-label">{business.mainCategory || business.category}</p><div className="meta-row"><Rating value={rating} count={reviews} /><span><MapPin size={14} />{business.area}</span></div><div className="tag-row">{(business.serviceTags || business.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div><div className="card-footer"><p>From <strong>{formatNaira(business.price || business.items?.[0]?.price || 5000)}</strong></p><Link className="text-link" to={`/businesses/${business.slug}`}>View business <span>→</span></Link></div></div>
  </article>
}
export function EmptyState({ icon: Icon, title, text, action, to }) { return <div className="empty"><span className="empty-icon"><Icon size={26} /></span><h3>{title}</h3><p>{text}</p>{action && <Link className="btn btn-primary" to={to}>{action}</Link>}</div> }
export function Status({ children, tone = 'blue' }) { return <span className={`status status-${tone}`}>{children}</span> }
