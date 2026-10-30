export type Ears = 'up' | 'floppy' | 'round'
export type Eyes = 'dot' | 'happy' | 'sleepy' | 'wink' | 'wide' | 'star' | 'heart' | 'dizzy' | 'angry' | 'side' | 'tired' | 'money'
export type Mouth = 'smile' | 'grin' | 'open' | 'tongue' | 'flat' | 'smirk' | 'o' | 'fangs' | 'frown' | 'goldtooth'
export type Accessory =
  | 'sunglasses'
  | 'glasses'
  | 'monocle'
  | 'eyepatch'
  | 'glasses3d'
  | 'goggles'
  | 'tophat'
  | 'cap'
  | 'crown'
  | 'party'
  | 'beanie'
  | 'chef'
  | 'cowboy'
  | 'viking'
  | 'wizard'
  | 'halo'
  | 'horns'
  | 'fedora'
  | 'beret'
  | 'santa'
  | 'bow'
  | 'headphones'
  | 'bandana'
  | 'sweatband'
  | 'flower'
  | 'mohawk'
  | 'curl'
  | 'vampireHair'
  | 'handlebar'
  | 'walrus'
  | 'beard'
  | 'cigar'
  | 'pipe'
  | 'bandaid'
  | 'scar'
  | 'earring'
  | 'bowtie'
  | 'scarf'
  | 'icepack'
  | 'cape'
  | 'sweat'
  | 'tear'
  | 'clownNose'
  | 'mullet'

export interface PigConfig {
  skin: string
  snout: string
  background: string
  ears: Ears
  eyes: Eyes
  mouth: Mouth
  cheeks?: boolean
  spots?: boolean
  accessories: Accessory[]
}

const PINK = { skin: '#F7AFC0', snout: '#EE8FA6' }
const ROSE = { skin: '#F4BCC9', snout: '#E996AB' }
const DEEP = { skin: '#EC93AA', snout: '#DC7290' }
const PEACH = { skin: '#F6C4AE', snout: '#EAA286' }
const TAN = { skin: '#E3B48E', snout: '#CF9468' }
const BLUSH = { skin: '#FAD1DA', snout: '#F2A9BB' }
const MUD = { skin: '#D9A0A0', snout: '#C27E80' }
const LILAC = { skin: '#EBB5D0', snout: '#D88FB5' }

const BG = ['#2443C6', '#F0B30A', '#D9364A', '#13A06E', '#E8731F', '#7A4FD0', '#5FA8E8', '#121A33', '#D9468F', '#9CC63B']

export const PIGS: PigConfig[] = [
  { ...PINK, background: BG[0], ears: 'up', eyes: 'dot', mouth: 'smile', cheeks: true, accessories: [] },
  { ...PINK, background: BG[7], ears: 'up', eyes: 'dot', mouth: 'fangs', accessories: ['cape', 'vampireHair'] },
  { ...DEEP, background: BG[1], ears: 'up', eyes: 'dot', mouth: 'goldtooth', accessories: ['sunglasses', 'earring'] },
  { ...TAN, background: BG[4], ears: 'floppy', eyes: 'tired', mouth: 'flat', accessories: ['icepack', 'bandaid'] },
  { ...PEACH, background: BG[2], ears: 'up', eyes: 'dot', mouth: 'smirk', accessories: ['fedora', 'scar', 'cigar'] },
  { ...ROSE, background: BG[5], ears: 'round', eyes: 'heart', mouth: 'tongue', cheeks: true, accessories: ['bow'] },
  { ...PINK, background: BG[3], ears: 'up', eyes: 'happy', mouth: 'grin', accessories: ['party'] },
  { ...BLUSH, background: BG[6], ears: 'floppy', eyes: 'sleepy', mouth: 'o', accessories: ['beanie'] },
  { ...MUD, background: BG[1], ears: 'up', eyes: 'dot', mouth: 'smile', spots: true, accessories: ['cowboy', 'bandana'] },
  { ...PINK, background: BG[2], ears: 'up', eyes: 'dot', mouth: 'smile', cheeks: true, accessories: ['santa'] },
  { ...DEEP, background: BG[0], ears: 'up', eyes: 'wink', mouth: 'smirk', accessories: ['tophat', 'monocle', 'handlebar'] },
  { ...TAN, background: BG[3], ears: 'floppy', eyes: 'dot', mouth: 'smile', accessories: ['chef', 'walrus'] },
  { ...ROSE, background: BG[8], ears: 'up', eyes: 'star', mouth: 'grin', accessories: ['crown'] },
  { ...PINK, background: BG[5], ears: 'up', eyes: 'dot', mouth: 'smirk', accessories: ['wizard', 'beard'] },
  { ...PEACH, background: BG[6], ears: 'up', eyes: 'happy', mouth: 'smile', cheeks: true, accessories: ['halo'] },
  { ...DEEP, background: BG[7], ears: 'up', eyes: 'angry', mouth: 'grin', accessories: ['horns'] },
  { ...BLUSH, background: BG[4], ears: 'round', eyes: 'wide', mouth: 'o', accessories: ['glasses'] },
  { ...MUD, background: BG[0], ears: 'up', eyes: 'angry', mouth: 'flat', accessories: ['viking', 'beard'] },
  { ...PINK, background: BG[9], ears: 'floppy', eyes: 'dot', mouth: 'smile', cheeks: true, accessories: ['beret', 'handlebar', 'scarf'] },
  { ...LILAC, background: BG[1], ears: 'up', eyes: 'dot', mouth: 'smirk', accessories: ['headphones'] },
  { ...TAN, background: BG[2], ears: 'up', eyes: 'dizzy', mouth: 'tongue', accessories: ['party', 'sweat'] },
  { ...PINK, background: BG[6], ears: 'up', eyes: 'dot', mouth: 'grin', accessories: ['glasses3d'] },
  { ...ROSE, background: BG[3], ears: 'floppy', eyes: 'happy', mouth: 'smile', accessories: ['flower', 'earring'] },
  { ...DEEP, background: BG[4], ears: 'up', eyes: 'dot', mouth: 'smile', accessories: ['mohawk', 'earring'] },
  { ...PEACH, background: BG[7], ears: 'up', eyes: 'money', mouth: 'grin', accessories: ['tophat', 'cigar'] },
  { ...BLUSH, background: BG[5], ears: 'up', eyes: 'wide', mouth: 'frown', accessories: ['tear'] },
  { ...PINK, background: BG[1], ears: 'up', eyes: 'dot', mouth: 'smile', accessories: ['cap', 'sunglasses'] },
  { ...MUD, background: BG[8], ears: 'floppy', eyes: 'sleepy', mouth: 'smile', spots: true, accessories: ['pipe'] },
  { ...TAN, background: BG[0], ears: 'up', eyes: 'side', mouth: 'smirk', accessories: ['eyepatch', 'bandana'] },
  { ...PINK, background: BG[2], ears: 'round', eyes: 'dot', mouth: 'grin', accessories: ['clownNose', 'party'] },
  { ...DEEP, background: BG[6], ears: 'up', eyes: 'dot', mouth: 'flat', accessories: ['goggles', 'beanie'] },
  { ...LILAC, background: BG[9], ears: 'up', eyes: 'happy', mouth: 'open', cheeks: true, accessories: ['bowtie'] },
  { ...PEACH, background: BG[1], ears: 'up', eyes: 'angry', mouth: 'smirk', accessories: ['sweatband', 'walrus'] },
  { ...ROSE, background: BG[7], ears: 'up', eyes: 'dot', mouth: 'smile', accessories: ['mullet', 'handlebar', 'sunglasses'] },
  { ...PINK, background: BG[4], ears: 'floppy', eyes: 'wink', mouth: 'tongue', accessories: ['curl'] },
  { ...BLUSH, background: BG[3], ears: 'up', eyes: 'star', mouth: 'open', cheeks: true, accessories: ['crown', 'earring'] },
  { ...TAN, background: BG[5], ears: 'up', eyes: 'tired', mouth: 'frown', accessories: ['sweat', 'bandaid'] },
  { ...DEEP, background: BG[8], ears: 'round', eyes: 'dot', mouth: 'smirk', accessories: ['fedora', 'bowtie'] },
  { ...MUD, background: BG[6], ears: 'up', eyes: 'dot', mouth: 'smile', spots: true, accessories: ['scarf', 'beanie'] },
  { ...PINK, background: BG[0], ears: 'up', eyes: 'happy', mouth: 'grin', accessories: ['chef'] },
  { ...PEACH, background: BG[2], ears: 'floppy', eyes: 'wide', mouth: 'o', accessories: ['headphones', 'glasses'] },
  { ...LILAC, background: BG[7], ears: 'up', eyes: 'dot', mouth: 'fangs', accessories: ['horns', 'cape'] },
  { ...ROSE, background: BG[1], ears: 'up', eyes: 'sleepy', mouth: 'smile', cheeks: true, accessories: ['halo', 'bow'] },
  { ...TAN, background: BG[9], ears: 'up', eyes: 'dot', mouth: 'smirk', accessories: ['cowboy', 'cigar', 'scar'] },
  { ...PINK, background: BG[5], ears: 'up', eyes: 'dizzy', mouth: 'open', accessories: ['icepack'] },
  { ...DEEP, background: BG[3], ears: 'floppy', eyes: 'dot', mouth: 'grin', accessories: ['viking'] },
  { ...BLUSH, background: BG[2], ears: 'round', eyes: 'heart', mouth: 'smile', cheeks: true, accessories: ['flower', 'santa'] },
  { ...MUD, background: BG[4], ears: 'up', eyes: 'side', mouth: 'flat', spots: true, accessories: ['monocle', 'walrus', 'tophat'] },
  { ...PEACH, background: BG[0], ears: 'up', eyes: 'money', mouth: 'smirk', accessories: ['sunglasses', 'earring', 'bowtie'] },
  { ...PINK, background: BG[8], ears: 'up', eyes: 'wink', mouth: 'grin', cheeks: true, accessories: ['mohawk', 'glasses3d'] },
]

export const PIG_COUNT = PIGS.length
