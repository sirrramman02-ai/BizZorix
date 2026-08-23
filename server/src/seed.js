import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Area, Business, Category, Conversation, CustomerRequest, Match, Message, Notification, ProductService, Promotion, Quotation, Review, User } from './models.js'
import { keywordsFrom, matchRequest } from './matching.js'

export const categoryNames = ['Food and Catering', 'Fashion and Tailoring', 'Beauty and Grooming', 'Electronics and Phone Repairs', 'Computer and Tech Services', 'Home Repairs and Maintenance', 'Cleaning Services', 'Auto Services', 'Printing and Branding', 'Photography and Video', 'Events and Decoration', 'Professional Services', 'Education and Training', 'Retail and Shopping', 'Logistics and Delivery', 'Health and Wellness', 'Real Estate and Accommodation', 'Agriculture and Food Supply', 'Other']
export const areaNames = ['Alagbaka', 'Ijapo Estate', 'FUTA North Gate', 'FUTA South Gate', 'Oba Adesida Road', 'Arakale', 'Isinkan', 'Oke-Aro', 'Oke-Ijebu', 'Oja-Oba', 'Ondo Road', 'Ilesha Garage', 'Shagari Village', 'Aule', 'Fanibi', 'Sijuade', 'NEPA Area', 'Cathedral Area', 'Akure City Centre', 'Other Akure Area']
const photos = {
  cake: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=80',
  phone: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80',
  print: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?auto=format&fit=crop&w=1200&q=80',
  home: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=80',
  photo: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
  fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1200&q=80',
  tech: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bizzorix')
  await Promise.all(Object.values(mongoose.models).map((entry) => entry.deleteMany({})))
  await Category.insertMany(categoryNames.map((name, order) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), order })))
  await Area.insertMany(areaNames.map((name, order) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), order })))
  const passwordHash = await bcrypt.hash('Demo1234!', 12)
  const [customer, businessUser, admin, ...owners] = await User.insertMany([
    { fullName: 'Aderonke Akinyemi', email: 'customer@bizzorix.demo', passwordHash, role: 'customer', preferredArea: 'Alagbaka' },
    { fullName: 'Temitope Adesina', email: 'business@bizzorix.demo', passwordHash, role: 'business', preferredArea: 'Alagbaka' },
    { fullName: 'BizZorix Administrator', email: 'admin@bizzorix.demo', passwordHash, role: 'admin' },
    ...['Chinedu Okafor', 'Bimpe Afolayan', 'Lanre Bello', 'Sade Adeyemi', 'Bola Ojo', 'Kemi Ajayi', 'Yemi Adebayo'].map((fullName, index) => ({ fullName, email: `owner${index + 1}@bizzorix.demo`, passwordHash, role: 'business' })),
  ])
  const specs = [
    ['Alagbaka Cakes & Treats', businessUser, 'Food and Catering', 'Alagbaka', 'Celebration cakes baked fresh for every Akure moment.', ['birthday cake', 'chocolate cake', 'cupcakes', 'delivery'], photos.cake, true, 4.9, 38],
    ['BluePeak Phone Repairs', owners[0], 'Electronics and Phone Repairs', 'FUTA South Gate', 'Fast, careful smartphone repairs with clear prices.', ['screen replacement', 'battery', 'smartphone display', 'diagnostics'], photos.phone, true, 4.8, 64],
    ['CrestLine Graphics', owners[1], 'Printing and Branding', 'Alagbaka', 'Brand identity, signs and premium print production.', ['logo design', 'banner', 'business cards'], photos.print, true, 4.7, 29],
    ['Ijapo HomeFix Services', owners[2], 'Home Repairs and Maintenance', 'Ijapo Estate', 'Trusted plumbers, electricians and handymen for your home.', ['plumbing', 'electrical', 'repairs'], photos.home, true, 4.6, 21],
    ['SunTrail Photography', owners[3], 'Photography and Video', 'Akure City Centre', 'Warm, documentary-style coverage for people and events.', ['weddings', 'portraits', 'events'], photos.photo, true, 4.9, 46],
    ['Akure QuickPrint Hub', owners[4], 'Printing and Branding', 'Oba Adesida Road', 'Reliable same-day prints for businesses and students.', ['flyers', 'posters', 'binding'], photos.print, false, 4.5, 18],
    ['GreenBasket Foods', owners[5], 'Agriculture and Food Supply', 'Oja-Oba', 'Fresh local produce and pantry staples delivered in Akure.', ['vegetables', 'fruit', 'food supply'], photos.food, false, 4.4, 15],
    ['MetroStyle Tailoring', owners[6], 'Fashion and Tailoring', 'Isinkan', 'Modern Nigerian outfits made to fit and made to last.', ['native wear', 'alterations', 'bridal'], photos.fashion, false, 4.8, 33],
  ]
  const businesses = await Business.insertMany(specs.map(([name, owner, mainCategory, area, description, serviceTags, coverImage, isFeatured, averageRating, reviewCount], index) => ({ ownerId: owner._id, name, slug: name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), mainCategory, area, description, serviceTags, coverImage, logo: coverImage, serviceAreas: index === 0 ? ['Alagbaka', 'Ijapo Estate', 'Akure City Centre'] : [area, 'Akure City Centre'], verificationStatus: index < 5 ? 'verified' : index === 5 ? 'pending' : 'draft', isFeatured, averageRating, reviewCount, publicPhone: index < 5 ? `0803 555 10${index}0` : undefined, contactPreferences: ['in-app message'], openingHours: { summary: 'Mon–Sat, 8:00 AM–6:00 PM' } })))
  const itemNames = [
    ['Classic birthday cake', 'Chocolate or vanilla celebration cake', 18000], ['Premium chocolate cake', 'Rich chocolate cake with custom message', 23500], ['Cupcake box', 'Twelve decorated cupcakes', 9000],
    ['Smartphone screen replacement', 'Quality display replacement with testing', 15000], ['Battery replacement', 'Battery health check and replacement', 8500], ['Phone diagnostics', 'Complete device fault check', 3000],
    ['Logo & brand starter', 'Logo, colour palette and social avatar', 35000], ['Business card printing', '500 premium full-colour cards', 18000], ['Outdoor banner', 'Durable full-colour banner', 12000],
    ['Plumbing callout', 'Leak diagnosis and minor repair', 8000], ['Electrical inspection', 'Safe home electrical fault check', 10000], ['Home maintenance visit', 'General repairs and assessment', 12000],
    ['Portrait session', 'One-hour outdoor portrait session', 30000], ['Event photography', 'Professional event coverage', 80000], ['Product photos', 'Ten edited product photographs', 40000],
    ['A5 flyers', '500 full-colour promotional flyers', 22000], ['Project binding', 'Professional academic document binding', 2500],
    ['Fresh vegetable basket', 'Seasonal vegetables for the week', 15000], ['Native two-piece', 'Custom-fitted two-piece outfit', 45000], ['Clothing alterations', 'Professional adjustments and finishing', 5000],
  ]
  let cursor = 0
  for (let b = 0; b < businesses.length; b++) {
    const count = b < 5 ? 3 : b === 5 ? 2 : b === 6 ? 1 : 2
    for (let i = 0; i < count; i++) { const [name, description, price] = itemNames[cursor++]; await ProductService.create({ businessId: businesses[b]._id, name, description, category: businesses[b].mainCategory, tags: name.toLowerCase().split(' '), pricingType: i === 0 ? 'starting' : 'fixed', price, image: businesses[b].coverImage }) }
  }
  const requestSpecs = [
    ['I need a medium chocolate birthday cake', 'I need a medium chocolate birthday cake delivered around Alagbaka by Saturday afternoon. My budget is around ₦25,000.', 'Food and Catering', 'Alagbaka', 25000, 'matched'],
    ['Replace my cracked phone screen', 'My Android phone display is cracked and I need a reliable screen replacement this week.', 'Electronics and Phone Repairs', 'FUTA South Gate', 20000, 'offers_received'],
    ['Design and print business cards', 'I need a clean business card design and 500 copies for a new consulting company.', 'Printing and Branding', 'Alagbaka', 30000, 'matched'],
    ['Fix leaking kitchen sink', 'Kitchen tap and pipe are leaking and need attention as soon as possible.', 'Home Repairs and Maintenance', 'Ijapo Estate', 15000, 'in_progress'],
    ['Photographer for family event', 'Need a photographer for a small family celebration next month.', 'Photography and Video', 'Akure City Centre', 60000, 'open'],
    ['Tailor for native outfit', 'I need a well-fitted native outfit ready in two weeks.', 'Fashion and Tailoring', 'Isinkan', 45000, 'completed'],
  ]
  const requests = []
  for (const [title, description, category, area, budgetAmount, status] of requestSpecs) { const request = await CustomerRequest.create({ customerId: customer.id, title, description, category, area, budgetType: 'fixed', budgetAmount, urgency: 'This week', neededBy: new Date(Date.now() + 7 * 86400000), keywords: keywordsFrom(`${title} ${description}`), status }); requests.push(request); await matchRequest(request) }
  const quotations = []
  const quoteSpecs = [[0, 0, 23500, 'sent'], [1, 1, 17500, 'sent'], [2, 2, 28000, 'sent'], [3, 3, 12000, 'accepted'], [5, 7, 42000, 'completed']]
  for (const [requestIndex, businessIndex, amount, status] of quoteSpecs) quotations.push(await Quotation.create({ requestId: requests[requestIndex].id, businessId: businesses[businessIndex].id, customerId: customer.id, amount, message: 'We can handle this with care and keep you updated from start to finish.', estimatedCompletion: 'Within 2 days', expiryDate: new Date(Date.now() + 5 * 86400000), status }))
  requests[3].acceptedQuotationId = quotations[3].id; await requests[3].save(); requests[5].acceptedQuotationId = quotations[4].id; await requests[5].save()
  for (let i = 0; i < 5; i++) await Review.create({ businessId: businesses[i].id, customerId: customer.id, requestId: i === 4 ? requests[5].id : undefined, quotationId: i === 4 ? quotations[4].id : undefined, rating: i === 3 ? 4 : 5, comment: ['Beautiful work and right on time.', 'Clear communication and a careful repair.', 'The print quality was excellent.', 'Professional and tidy service.', 'Excellent experience from start to finish.'][i] })
  await Promotion.insertMany([{ businessId: businesses[0].id, title: 'Celebration cake bundle', description: 'Free name topper on celebration cakes this week.', startDate: new Date(), endDate: new Date(Date.now() + 14 * 86400000), status: 'active', isFeatured: true }, { businessId: businesses[1].id, title: 'Free phone diagnostics', description: 'Free diagnostics with every completed repair.', startDate: new Date(), endDate: new Date(Date.now() + 14 * 86400000), status: 'active', isFeatured: true }, { businessId: businesses[2].id, title: 'New business print pack', description: 'Save on cards, flyers and a pull-up banner.', startDate: new Date(), endDate: new Date(Date.now() + 21 * 86400000), status: 'active' }])
  const conversation = await Conversation.create({ customerId: customer.id, businessId: businesses[3].id, requestId: requests[3].id, quotationId: quotations[3].id })
  await Message.insertMany([{ conversationId: conversation.id, senderId: customer.id, body: 'Hello, what time can you come by tomorrow?' }, { conversationId: conversation.id, senderId: owners[2].id, body: 'Good afternoon! I can be there by 10 AM.' }])
  await Notification.insertMany([{ userId: customer.id, type: 'quotation', title: 'New quotation received', body: 'Alagbaka Cakes & Treats sent you an offer.', link: `/requests/${requests[0].id}/offers` }, { userId: businessUser.id, type: 'match', title: 'New matched request', body: 'A customer in Alagbaka needs a birthday cake.', link: '/business-dashboard/requests' }])
  console.log('BizZorix demo data seeded successfully.')
  console.log('Demo password for all accounts: Demo1234!')
  await mongoose.disconnect()
}

seed().catch((error) => { console.error(error); process.exit(1) })
