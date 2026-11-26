import bcrypt from 'bcryptjs';
import { Comment } from '../models/Comment.js';
import { DiaryItem } from '../models/DiaryItem.js';
import { Movie } from '../models/Movie.js';
import { MovieList } from '../models/MovieList.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { recalculateMovieRatings } from '../services/review.service.js';

const HERO_NOIR = '/src/assets/images/hero_noir_thriller_1795660870330.jpg';
const HERO_SCIFI = '/src/assets/images/hero_scifi_odyssey_1795660870552.jpg';
const HERO_ROYAL = '/src/assets/images/hero_royal_drama_1795660871786.jpg';
const POSTER_SONATA = '/src/assets/images/poster_midnight_sonata_1795660872165.jpg';
const POSTER_MONSOON = '/src/assets/images/poster_crimson_monsoon_1795660872562.jpg';
const POSTER_SEOUL = '/src/assets/images/poster_seoul_shadows_1795660873306.jpg';

const SEED_MOVIES = [
  {
    slug: 'dune-part-two-2024',
    title: 'Dune: Part Two',
    tagline: 'Long live the fighters.',
    overview:
      'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.',
    posterUrl: '/src/assets/posters/dune_part_two.svg',
    backdropUrl: HERO_SCIFI,
    trailerUrl: 'https://www.youtube.com/watch?v=Way9Dexny3w',
    releaseDate: new Date('2024-03-01'),
    runtime: 166,
    genres: ['Sci-Fi', 'Adventure', 'Drama'],
    language: 'English',
    industry: 'Hollywood',
    director: 'Denis Villeneuve',
    cast: [
      { name: 'Timothee Chalamet', character: 'Paul Atreides' },
      { name: 'Zendaya', character: 'Chani' },
      { name: 'Rebecca Ferguson', character: 'Lady Jessica' },
      { name: 'Javier Bardem', character: 'Stilgar' },
      { name: 'Austin Butler', character: 'Feyd-Rautha' },
    ],
    featured: true,
  },
  {
    slug: 'maharaja-2024',
    title: 'Maharaja',
    tagline: 'The barber only wants his Lakshmi back.',
    overview:
      'A mild-mannered barber walks into a Chennai police station insisting officers track down a stolen iron dustbin he calls Lakshmi. What begins as an absurd complaint unravels into a devastating non-linear labyrinth of vengeance, guilt, and fate.',
    posterUrl: '/src/assets/posters/maharaja.svg',
    backdropUrl: HERO_NOIR,
    trailerUrl: 'https://www.youtube.com/watch?v=UsW95hX8GTQ',
    releaseDate: new Date('2024-06-14'),
    runtime: 141,
    genres: ['Thriller', 'Crime', 'Mystery'],
    language: 'Tamil',
    industry: 'Tamil',
    director: 'Nithilan Swaminathan',
    cast: [
      { name: 'Vijay Sethupathi', character: 'Maharaja' },
      { name: 'Anurag Kashyap', character: 'Selvam' },
      { name: 'Mamta Mohandas', character: 'Aasifa' },
      { name: 'Natty Subramaniam', character: 'Inspector Varadharajan' },
    ],
    featured: true,
  },
  {
    slug: 'tumbbad-2018',
    title: 'Tumbbad',
    tagline: 'Greed is a curse that outlives empires.',
    overview:
      'Across three generations in rain-lashed 20th-century Maharashtra, Vinayak Rao becomes consumed by an ancestral myth buried beneath a decaying mansion—a cursed womb guarded by an ancient fallen god whose gold exacts a monstrous price.',
    posterUrl: '/src/assets/posters/tumbbad.svg',
    backdropUrl: HERO_ROYAL,
    trailerUrl: 'https://www.youtube.com/watch?v=sN75MPxgvX8',
    releaseDate: new Date('2018-10-12'),
    runtime: 104,
    genres: ['Horror', 'Fantasy', 'Drama'],
    language: 'Hindi',
    industry: 'Bollywood',
    director: 'Rahi Anil Barve',
    cast: [
      { name: 'Sohum Shah', character: 'Vinayak Rao' },
      { name: 'Jyoti Malshe', character: 'Vinayak’s Mother' },
      { name: 'Anita Date-Kelkar', character: 'Vaidehi' },
      { name: 'Ronjini Chakraborty', character: 'Mistress' },
    ],
    featured: true,
  },
  {
    slug: 'oldboy-2003',
    title: 'Oldboy',
    tagline: 'Laugh and the world laughs with you. Weep and you weep alone.',
    overview:
      'Abducted without explanation and locked inside a windowless hotel-like cell for fifteen years, Oh Dae-su is abruptly released onto a Seoul rooftop with a wallet, a phone, and five days to uncover who stole his life and why.',
    posterUrl: POSTER_SEOUL,
    backdropUrl: HERO_NOIR,
    trailerUrl: 'https://www.youtube.com/watch?v=2HkjrJ6IK5E',
    releaseDate: new Date('2003-11-21'),
    runtime: 120,
    genres: ['Mystery', 'Thriller', 'Drama'],
    language: 'Korean',
    industry: 'Korean',
    director: 'Park Chan-wook',
    cast: [
      { name: 'Choi Min-sik', character: 'Oh Dae-su' },
      { name: 'Yoo Ji-tae', character: 'Lee Woo-jin' },
      { name: 'Kang Hye-jung', character: 'Mi-do' },
    ],
    featured: true,
  },
  {
    slug: 'oppenheimer-2023',
    title: 'Oppenheimer',
    tagline: 'The world forever changes.',
    overview:
      'Theoretical physicist J. Robert Oppenheimer leads the clandestine Manhattan Project at Los Alamos to construct the atomic bomb, before facing a politically orchestrated postwar security hearing that strips away his legacy.',
    posterUrl: '/src/assets/posters/oppenheimer.svg',
    backdropUrl: HERO_SCIFI,
    trailerUrl: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
    releaseDate: new Date('2023-07-21'),
    runtime: 180,
    genres: ['Drama', 'History', 'Thriller'],
    language: 'English',
    industry: 'Hollywood',
    director: 'Christopher Nolan',
    cast: [
      { name: 'Cillian Murphy', character: 'J. Robert Oppenheimer' },
      { name: 'Emily Blunt', character: 'Kitty Oppenheimer' },
      { name: 'Matt Damon', character: 'Leslie Groves' },
      { name: 'Robert Downey Jr.', character: 'Lewis Strauss' },
    ],
    featured: false,
  },
  {
    slug: 'whiplash-2014',
    title: 'Whiplash',
    tagline: 'The road to greatness can take you to the edge.',
    overview:
      'An ambitious young jazz drummer enrolls at an elite Manhattan conservatory, only to fall under the tyrannical tutelage of a conductor whose obsession with perfection pushes mentor and prodigy toward psychological ruin.',
    posterUrl: POSTER_SONATA,
    backdropUrl: HERO_NOIR,
    trailerUrl: 'https://www.youtube.com/watch?v=7d_jQycdQGo',
    releaseDate: new Date('2014-10-10'),
    runtime: 107,
    genres: ['Drama', 'Music'],
    language: 'English',
    industry: 'Hollywood',
    director: 'Damien Chazelle',
    cast: [
      { name: 'Miles Teller', character: 'Andrew Neiman' },
      { name: 'J.K. Simmons', character: 'Terence Fletcher' },
      { name: 'Paul Reiser', character: 'Jim Neiman' },
    ],
    featured: false,
  },
  {
    slug: 'andhadhun-2018',
    title: 'Andhadhun',
    tagline: 'What you see is never what is.',
    overview:
      'A Pune concert pianist pretending to be blind to sharpen his musical focus inadvertently witnesses a high-profile murder inside a fading film star’s apartment, triggering a wickedly unpredictable spiral of blackmail and survival.',
    posterUrl: '/src/assets/posters/andhadhun.svg',
    backdropUrl: HERO_NOIR,
    trailerUrl: 'https://www.youtube.com/watch?v=2iVYI99VGaw',
    releaseDate: new Date('2018-10-05'),
    runtime: 139,
    genres: ['Crime', 'Thriller', 'Comedy'],
    language: 'Hindi',
    industry: 'Bollywood',
    director: 'Sriram Raghavan',
    cast: [
      { name: 'Ayushmann Khurrana', character: 'Akash' },
      { name: 'Tabu', character: 'Simi' },
      { name: 'Radhika Apte', character: 'Sophie' },
    ],
    featured: false,
  },
  {
    slug: '3-idiots-2009',
    title: '3 Idiots',
    tagline: 'All is well.',
    overview:
      'Ten years after graduating from India’s most pressure-cooker engineering institute, two loyal friends embark on a road trip across the Himalayas to track down the brilliant rebel who taught them how to truly learn.',
    posterUrl: '/src/assets/posters/three_idiots.svg',
    backdropUrl: HERO_ROYAL,
    trailerUrl: 'https://www.youtube.com/watch?v=K0eDlFX9GMc',
    releaseDate: new Date('2009-12-25'),
    runtime: 170,
    genres: ['Comedy', 'Drama'],
    language: 'Hindi',
    industry: 'Bollywood',
    director: 'Rajkumar Hirani',
    cast: [
      { name: 'Aamir Khan', character: 'Rancho' },
      { name: 'R. Madhavan', character: 'Farhan Qureshi' },
      { name: 'Sharman Joshi', character: 'Raju Rastogi' },
      { name: 'Kareena Kapoor', character: 'Pia' },
    ],
    featured: false,
  },
  {
    slug: 'vikram-2022',
    title: 'Vikram',
    tagline: 'Once upon a time there lived a ghost.',
    overview:
      'A black-ops investigator tracks a masked vigilante syndicate targeting corrupt narcotics officials, uncovering a buried ghost from 1986 and a cartel warlord whose empire threatens the entire southern coast.',
    posterUrl: '/src/assets/posters/vikram.svg',
    backdropUrl: HERO_NOIR,
    trailerUrl: 'https://www.youtube.com/watch?v=OKBMCL-frPU',
    releaseDate: new Date('2022-06-03'),
    runtime: 175,
    genres: ['Action', 'Thriller', 'Crime'],
    language: 'Tamil',
    industry: 'Tamil',
    director: 'Lokesh Kanagaraj',
    cast: [
      { name: 'Kamal Haasan', character: 'Agent Vikram' },
      { name: 'Vijay Sethupathi', character: 'Sandhanam' },
      { name: 'Fahadh Faasil', character: 'Amar' },
    ],
    featured: false,
  },
  {
    slug: 'rrr-2022',
    title: 'RRR',
    tagline: 'Rise. Roar. Revolt.',
    overview:
      'In 1920s British-occupied Delhi, a fearless tribal protector and an intensely driven imperial police officer forge an electric brotherhood—unaware that each is hunting the other’s true mission.',
    posterUrl: '/src/assets/posters/rrr.svg',
    backdropUrl: HERO_ROYAL,
    trailerUrl: 'https://www.youtube.com/watch?v=f_vbAtFSEc0',
    releaseDate: new Date('2022-03-25'),
    runtime: 187,
    genres: ['Action', 'Drama', 'History'],
    language: 'Telugu',
    industry: 'Telugu',
    director: 'S.S. Rajamouli',
    cast: [
      { name: 'N.T. Rama Rao Jr.', character: 'Komaram Bheem' },
      { name: 'Ram Charan', character: 'Alluri Sitarama Raju' },
      { name: 'Alia Bhatt', character: 'Sita' },
    ],
    featured: false,
  },
  {
    slug: 'manjummel-boys-2024',
    title: 'Manjummel Boys',
    tagline: 'No friend gets left behind in the dark.',
    overview:
      'When a group of working-class friends from Kochi venture off-trail into the mist-shrouded Guna Caves in Kodaikanal, a sudden fall into a bottomless chasm turns an ordinary holiday into an unforgettable feat of courage.',
    posterUrl: '/src/assets/posters/manjummel_boys.svg',
    backdropUrl: HERO_ROYAL,
    trailerUrl: 'https://www.youtube.com/watch?v=id848Ww1YLo',
    releaseDate: new Date('2024-02-22'),
    runtime: 135,
    genres: ['Adventure', 'Drama', 'Thriller'],
    language: 'Malayalam',
    industry: 'Malayalam',
    director: 'Chidambaram',
    cast: [
      { name: 'Soubin Shahir', character: 'Kuttan' },
      { name: 'Sreenath Bhasi', character: 'Subhash' },
      { name: 'Balu Varghese', character: 'Sixon' },
    ],
    featured: false,
  },
  {
    slug: 'kumbalangi-nights-2019',
    title: 'Kumbalangi Nights',
    tagline: 'Four brothers, one fishing village, and the tide between them.',
    overview:
      'In the quiet backwaters of Kochi, four estranged brothers living in a half-built house slowly learn tenderness and accountability as love, grief, and a chillingly polite outsider enter their lives.',
    posterUrl: POSTER_MONSOON,
    backdropUrl: HERO_ROYAL,
    trailerUrl: 'https://www.youtube.com/watch?v=3P4BFBSafF0',
    releaseDate: new Date('2019-02-07'),
    runtime: 135,
    genres: ['Drama', 'Romance'],
    language: 'Malayalam',
    industry: 'Malayalam',
    director: 'Madhu C. Narayanan',
    cast: [
      { name: 'Fahadh Faasil', character: 'Shammi' },
      { name: 'Soubin Shahir', character: 'Saji' },
      { name: 'Shane Nigam', character: 'Bobby' },
      { name: 'Anna Ben', character: 'Babymol' },
    ],
    featured: false,
  },
  {
    slug: 'parasite-2019',
    title: 'Parasite',
    tagline: 'Act like you own the place.',
    overview:
      'Greed and class discrimination threaten the newly formed symbiotic relationship between the destitute Kim family and the ultra-wealthy Park household inside a glass-and-concrete Seoul hillside mansion.',
    posterUrl: '/src/assets/posters/parasite.svg',
    backdropUrl: HERO_NOIR,
    trailerUrl: 'https://www.youtube.com/watch?v=5xH0HfJHsaY',
    releaseDate: new Date('2019-05-30'),
    runtime: 132,
    genres: ['Thriller', 'Drama', 'Comedy'],
    language: 'Korean',
    industry: 'Korean',
    director: 'Bong Joon-ho',
    cast: [
      { name: 'Song Kang-ho', character: 'Kim Ki-taek' },
      { name: 'Choi Woo-shik', character: 'Kim Ki-woo' },
      { name: 'Park So-dam', character: 'Kim Ki-jung' },
      { name: 'Cho Yeo-jeong', character: 'Choi Yeon-gyo' },
    ],
    featured: false,
  },
  {
    slug: 'spirited-away-2001',
    title: 'Spirited Away',
    tagline: 'Nothing that happens is ever forgotten.',
    overview:
      'During her family’s move to the suburbs, ten-year-old Chihiro wanders into a realm ruled by gods, witches, and spirits, where she must work inside a sprawling bathhouse to free her transformed parents.',
    posterUrl: '/src/assets/posters/spirited_away.svg',
    backdropUrl: HERO_SCIFI,
    trailerUrl: 'https://www.youtube.com/watch?v=ByXuk9QqQkk',
    releaseDate: new Date('2001-07-20'),
    runtime: 125,
    genres: ['Animation', 'Fantasy', 'Adventure'],
    language: 'Japanese',
    industry: 'Japanese',
    director: 'Hayao Miyazaki',
    cast: [
      { name: 'Rumi Hiiragi', character: 'Chihiro Ogino' },
      { name: 'Miyu Irino', character: 'Haku' },
      { name: 'Mari Natsuki', character: 'Yubaba' },
    ],
    featured: false,
  },
  {
    slug: 'seven-samurai-1954',
    title: 'Seven Samurai',
    tagline: 'The wind, the rain, and seven blades against despair.',
    overview:
      'Desperate to defend their harvest from ruthless mountain bandits, farmers in feudal Japan recruit seven masterless samurai who have nothing left to lose except their honor.',
    posterUrl: '/src/assets/posters/seven_samurai.svg',
    backdropUrl: HERO_ROYAL,
    trailerUrl: 'https://www.youtube.com/watch?v=wJ1TOratCTo',
    releaseDate: new Date('1954-04-26'),
    runtime: 207,
    genres: ['Action', 'Drama'],
    language: 'Japanese',
    industry: 'Japanese',
    director: 'Akira Kurosawa',
    cast: [
      { name: 'Toshiro Mifune', character: 'Kikuchiyo' },
      { name: 'Takashi Shimura', character: 'Kambei Shimada' },
    ],
    featured: false,
  },
];

/**
 * Seeds the database with multi-industry films, sample users, reviews, comments,
 * diary entries, and curated movie lists.
 * @param {{ reset?: boolean }} options
 */
export async function seedDatabase({ reset = false } = {}) {
  if (reset) {
    await Promise.all([
      Comment.deleteMany({}),
      Review.deleteMany({}),
      DiaryItem.deleteMany({}),
      MovieList.deleteMany({}),
      Movie.deleteMany({}),
      User.deleteMany({}),
    ]);
  }

  const existingMoviesCount = await Movie.countDocuments();
  if (existingMoviesCount > 0 && !reset) {
    return { seeded: false };
  }

  const movies = await Movie.insertMany(SEED_MOVIES);
  const movieBySlug = new Map(movies.map((m) => [m.slug, m]));

  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash('Admin123!', 12),
    bcrypt.hash('Cinema123!', 12),
  ]);

  const users = await User.insertMany([
    {
      name: 'Elena Vance',
      username: 'elena_vance',
      email: 'admin@cgrade.cinema',
      passwordHash: adminHash,
      role: 'admin',
      bio: 'Programming director & archival cinema curator. Obsessed with 65mm photography and slow-burn noir.',
      favoriteMovies: [
        movieBySlug.get('dune-part-two-2024')._id,
        movieBySlug.get('parasite-2019')._id,
        movieBySlug.get('tumbbad-2018')._id,
        movieBySlug.get('seven-samurai-1954')._id,
      ],
    },
    {
      name: 'Arjun Mehta',
      username: 'arjun_mehta',
      email: 'critic@cgrade.cinema',
      passwordHash: userHash,
      role: 'critic',
      bio: 'Film essayist covering Mumbai, Chennai, and Kochi new-wave cinema.',
      favoriteMovies: [
        movieBySlug.get('maharaja-2024')._id,
        movieBySlug.get('kumbalangi-nights-2019')._id,
        movieBySlug.get('andhadhun-2018')._id,
        movieBySlug.get('whiplash-2014')._id,
      ],
    },
    {
      name: 'Meera Nair',
      username: 'meera_nair',
      email: 'meera@cgrade.cinema',
      passwordHash: userHash,
      role: 'critic',
      bio: 'Sound design nerd & late-night thriller devotee.',
      favoriteMovies: [
        movieBySlug.get('manjummel-boys-2024')._id,
        movieBySlug.get('oldboy-2003')._id,
        movieBySlug.get('spirited-away-2001')._id,
        movieBySlug.get('oppenheimer-2023')._id,
      ],
    },
    {
      name: 'Kenji Sato',
      username: 'kenji_sato',
      email: 'kenji@cgrade.cinema',
      passwordHash: userHash,
      role: 'user',
      bio: 'Tracking every repertory screening from Tokyo to Seoul.',
      favoriteMovies: [
        movieBySlug.get('seven-samurai-1954')._id,
        movieBySlug.get('spirited-away-2001')._id,
        movieBySlug.get('oldboy-2003')._id,
        movieBySlug.get('parasite-2019')._id,
      ],
    },
  ]);

  const [elena, arjun, meera, kenji] = users;

  // Establish follow relationships
  await Promise.all([
    User.findByIdAndUpdate(arjun._id, {
      $set: { following: [elena._id, meera._id], followers: [elena._id, kenji._id] },
    }),
    User.findByIdAndUpdate(elena._id, {
      $set: { following: [arjun._id, kenji._id], followers: [arjun._id, meera._id] },
    }),
    User.findByIdAndUpdate(meera._id, {
      $set: { following: [elena._id], followers: [arjun._id] },
    }),
    User.findByIdAndUpdate(kenji._id, {
      $set: { following: [arjun._id], followers: [elena._id] },
    }),
  ]);

  const seedReviewsData = [
    {
      movie: movieBySlug.get('dune-part-two-2024')._id,
      author: elena._id,
      rating: 5.0,
      title: 'Monumental scale carved out of sand and dread',
      body: 'Villeneuve turns messianic prophecy into an acoustic and visual assault. The black-and-white Giedi Prime arena sequence alone feels like cinema history etched in silver halide.',
      tags: ['Masterclass Cinematography', 'Slow Burn'],
      containsSpoilers: false,
      likes: [arjun._id, meera._id, kenji._id],
      likesCount: 3,
    },
    {
      movie: movieBySlug.get('dune-part-two-2024')._id,
      author: arjun._id,
      rating: 4.5,
      title: 'Chani’s quiet heartbreak anchors the spectacle',
      body: 'What separates Part Two from ordinary blockbusters is how coldly it watches Paul become the very tyrant he feared. Watching Zendaya’s final close-up turns triumph into tragedy.',
      tags: ['Masterclass Cinematography'],
      containsSpoilers: true,
      likes: [elena._id, meera._id],
      likesCount: 2,
    },
    {
      movie: movieBySlug.get('maharaja-2024')._id,
      author: arjun._id,
      rating: 5.0,
      title: 'Precision-engineered devastation in plain sight',
      body: 'Every throwaway line in the first hour is a loaded spring waiting for the final twenty minutes. Vijay Sethupathi plays grief with eerie stillness until the twist drops like a guillotine.',
      tags: ['Plot Twist', 'Slow Burn'],
      containsSpoilers: false,
      likes: [elena._id, meera._id, kenji._id],
      likesCount: 3,
    },
    {
      movie: movieBySlug.get('maharaja-2024')._id,
      author: meera._id,
      rating: 4.5,
      title: 'The non-linear timeline hides the truth right beneath the frame',
      body: 'Once you realize Selvam’s timeline runs years behind Maharaja’s police station visit, the scar reveal and the baby photo recontextualize every single scene.',
      tags: ['Plot Twist'],
      containsSpoilers: true,
      likes: [arjun._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('tumbbad-2018')._id,
      author: meera._id,
      rating: 5.0,
      title: 'Rain, lantern light, and a parable about endless hunger',
      body: 'Few horror films commit so deeply to folklore texture. Jesper Kyd’s score and Pankaj Kumar’s drenched chiaroscuro make every descent into Hastar’s womb suffocating.',
      tags: ['Masterclass Cinematography', 'Slow Burn'],
      containsSpoilers: false,
      likes: [elena._id, arjun._id],
      likesCount: 2,
    },
    {
      movie: movieBySlug.get('oldboy-2003')._id,
      author: kenji._id,
      rating: 5.0,
      title: 'Operatic fury choreographed in a single corridor',
      body: 'Park Chan-wook marries pulp vengeance with Greek tragedy. Choi Min-sik’s physicality in the hallway hammer brawl remains unmatched twenty years later.',
      tags: ['Plot Twist', 'Masterclass Cinematography'],
      containsSpoilers: false,
      likes: [elena._id, meera._id],
      likesCount: 2,
    },
    {
      movie: movieBySlug.get('parasite-2019')._id,
      author: elena._id,
      rating: 5.0,
      title: 'Razor-sharp architecture of class comedy turning to horror',
      body: 'Not a single shot or staircase is wasted. The tonal pivot at the midpoint is the cleanest trapdoor in modern cinema.',
      tags: ['Plot Twist', 'Masterclass Cinematography'],
      containsSpoilers: false,
      likes: [arjun._id, kenji._id],
      likesCount: 2,
    },
    {
      movie: movieBySlug.get('kumbalangi-nights-2019')._id,
      author: arjun._id,
      rating: 5.0,
      title: 'Luminous tenderness disguised as a small-town drama',
      body: 'Fahadh Faasil makes a neatly tucked shirt more terrifying than any slasher villain, while the four brothers earn every inch of warmth.',
      tags: ['Slow Burn'],
      containsSpoilers: false,
      likes: [meera._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('manjummel-boys-2024')._id,
      author: meera._id,
      rating: 4.5,
      title: 'Claustrophobia elevated by unconditional friendship',
      body: 'By the time the cave walls close in, Sushin Shyam’s synth pulse and the crew’s sheer panic feel tactile. You hold your breath for forty straight minutes.',
      tags: ['Mass Entertainer', 'Masterclass Cinematography'],
      containsSpoilers: false,
      likes: [arjun._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('whiplash-2014')._id,
      author: arjun._id,
      rating: 4.5,
      title: 'A sports thriller played entirely on brass and cymbals',
      body: 'Edited like a boxing match. That final Caravan solo leaves you exhilarated and horrified at the exact same moment.',
      tags: ['Slow Burn'],
      containsSpoilers: false,
      likes: [elena._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('oppenheimer-2023')._id,
      author: elena._id,
      rating: 4.5,
      title: 'Three hours of talking rooms edited with the momentum of a heist',
      body: 'Nolan strips away hero worship and leaves us with the chilling silence after Trinity.',
      tags: ['Masterclass Cinematography'],
      containsSpoilers: false,
      likes: [meera._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('andhadhun-2018')._id,
      author: arjun._id,
      rating: 4.5,
      title: 'Wickedly playful black comedy that never tips its hand',
      body: 'Sriram Raghavan refuses to let a single character stay innocent. That final cane tap on the street is pure mischief.',
      tags: ['Plot Twist'],
      containsSpoilers: false,
      likes: [elena._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('3-idiots-2009')._id,
      author: meera._id,
      rating: 4.5,
      title: 'Heartfelt satire that still hits with disarming sincerity',
      body: 'Balances broad campus humor with a genuinely moving indictment of rote pressure.',
      tags: ['Mass Entertainer'],
      containsSpoilers: false,
      likes: [],
      likesCount: 0,
    },
    {
      movie: movieBySlug.get('vikram-2022')._id,
      author: arjun._id,
      rating: 4.0,
      title: 'Anirudh’s percussion turns every corridor shootout into a cathedral',
      body: 'Lokesh Kanagaraj constructs an electric nocturnal underworld with Kamal Haasan commanding the frame.',
      tags: ['Mass Entertainer'],
      containsSpoilers: false,
      likes: [kenji._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('rrr-2022')._id,
      author: kenji._id,
      rating: 4.5,
      title: 'Mythic maximalism executed without an ounce of cynicism',
      body: 'Every entrance, bridge rescue, and dance-off operates at 110% conviction.',
      tags: ['Mass Entertainer'],
      containsSpoilers: false,
      likes: [arjun._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('spirited-away-2001')._id,
      author: kenji._id,
      rating: 5.0,
      title: 'The train across the flooded sea remains pure animation poetry',
      body: 'Miyazaki captures childhood fear and quiet resilience with hand-painted grace.',
      tags: ['Masterclass Cinematography'],
      containsSpoilers: false,
      likes: [elena._id, meera._id],
      likesCount: 2,
    },
    {
      movie: movieBySlug.get('seven-samurai-1954')._id,
      author: elena._id,
      rating: 5.0,
      title: 'The blueprint for every ensemble action film ever made',
      body: 'Three and a half hours pass like wind through tall grass. Every frame moves.',
      tags: ['Masterclass Cinematography'],
      containsSpoilers: false,
      likes: [kenji._id],
      likesCount: 1,
    },
    {
      movie: movieBySlug.get('tumbbad-2018')._id,
      author: kenji._id,
      rating: 4.5,
      title: 'Folk horror steeped in mud, monsoon, and ancestral rot',
      body: 'The atmospheric world-building rivals the finest European gothic cinema.',
      tags: ['Slow Burn'],
      containsSpoilers: false,
      likes: [],
      likesCount: 0,
    },
  ];

  const createdReviews = await Review.insertMany(seedReviewsData);

  // Add sample 1-level nested comments
  const firstReview = createdReviews[0];
  const maharajaReview = createdReviews[2];
  const rootComment = await Comment.create({
    review: firstReview._id,
    author: arjun._id,
    body: 'That Giedi Prime infrared sequence genuinely looked unlike anything I have seen in IMAX.',
  });
  await Comment.create({
    review: firstReview._id,
    author: elena._id,
    body: 'Greig Fraser shot those scenes with custom infrared sensors—zero color grading trickery.',
    parentComment: rootComment._id,
  });
  await Comment.create({
    review: maharajaReview._id,
    author: meera._id,
    body: 'On a second watch, every dialogue exchange in the barbershop feels completely different.',
  });

  // Recalculate accurate rating stats for every movie
  await Promise.all(movies.map((m) => recalculateMovieRatings(m._id)));

  // Seed Watchlist & Diary items
  await DiaryItem.insertMany([
    { user: elena._id, movie: movieBySlug.get('dune-part-two-2024')._id, status: 'watched', watchedAt: new Date('2024-03-04'), rewatchCount: 1 },
    { user: elena._id, movie: movieBySlug.get('parasite-2019')._id, status: 'watched', watchedAt: new Date('2024-05-12'), rewatchCount: 2 },
    { user: elena._id, movie: movieBySlug.get('maharaja-2024')._id, status: 'watchlist' },
    { user: arjun._id, movie: movieBySlug.get('maharaja-2024')._id, status: 'watched', watchedAt: new Date('2024-06-16'), rewatchCount: 1 },
    { user: arjun._id, movie: movieBySlug.get('kumbalangi-nights-2019')._id, status: 'watched', watchedAt: new Date('2024-02-11'), rewatchCount: 0 },
    { user: arjun._id, movie: movieBySlug.get('seven-samurai-1954')._id, status: 'watchlist' },
    { user: meera._id, movie: movieBySlug.get('tumbbad-2018')._id, status: 'watched', watchedAt: new Date('2024-04-02'), rewatchCount: 1 },
    { user: kenji._id, movie: movieBySlug.get('oldboy-2003')._id, status: 'watched', watchedAt: new Date('2024-01-19'), rewatchCount: 0 },
  ]);

  // Seed Curated Lists
  await MovieList.insertMany([
    {
      title: 'Essential Indian Neo-Noir & Twists',
      slug: 'essential-indian-neo-noir-and-twists',
      description: 'Labyrinthine thrillers from Chennai, Pune, and Mumbai where every detail matters.',
      owner: arjun._id,
      movies: [
        movieBySlug.get('maharaja-2024')._id,
        movieBySlug.get('andhadhun-2018')._id,
        movieBySlug.get('tumbbad-2018')._id,
        movieBySlug.get('vikram-2022')._id,
      ],
      isPublic: true,
      likes: [elena._id, meera._id, kenji._id],
      likesCount: 3,
    },
    {
      title: 'Korean Vengeance & Class Razorblades',
      slug: 'korean-vengeance-and-class-razorblades',
      description: 'Precision framing, moral dread, and unforgettable third-act reckonings from Seoul.',
      owner: elena._id,
      movies: [
        movieBySlug.get('oldboy-2003')._id,
        movieBySlug.get('parasite-2019')._id,
      ],
      isPublic: true,
      likes: [arjun._id, kenji._id],
      likesCount: 2,
    },
    {
      title: 'Monsoon Coastlines & Slow-Burn Soul',
      slug: 'monsoon-coastlines-and-slow-burn-soul',
      description: 'Atmospheric Malayalam and folk storytelling drenched in rain and human warmth.',
      owner: meera._id,
      movies: [
        movieBySlug.get('kumbalangi-nights-2019')._id,
        movieBySlug.get('manjummel-boys-2024')._id,
        movieBySlug.get('tumbbad-2018')._id,
      ],
      isPublic: true,
      likes: [arjun._id],
      likesCount: 1,
    },
    {
      title: 'Widescreen Titans: 65mm & Epic Craft',
      slug: 'widescreen-titans-65mm-and-epic-craft',
      description: 'Cinema built for the largest possible screen and thunderous sound systems.',
      owner: elena._id,
      movies: [
        movieBySlug.get('dune-part-two-2024')._id,
        movieBySlug.get('oppenheimer-2023')._id,
        movieBySlug.get('rrr-2022')._id,
        movieBySlug.get('seven-samurai-1954')._id,
      ],
      isPublic: true,
      likes: [arjun._id, meera._id],
      likesCount: 2,
    },
  ]);

  return { seeded: true, moviesCount: movies.length };
}

/**
 * Ensures the catalog is populated on boot without overwriting existing data.
 */
export async function ensureSeeded() {
  const count = await Movie.countDocuments();
  if (count === 0) {
    const result = await seedDatabase({ reset: false });
    if (result.seeded) {
      console.log(`[Seed] Populated ${result.moviesCount} films across world cinema`);
    }
  }
}
