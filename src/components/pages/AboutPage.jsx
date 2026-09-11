import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { AlertCircle } from 'lucide-react'

// Sponsors data
const sponsors = [
  { name: 'National Science Foundation', logo: '/logos/NSF.png', desc: 'Award NSF-AGS 19 41110' },
  {
    name: 'Barcelona Supercomputing Center',
    logo: '/logos/BSC.JPEG',
    desc: 'CAMP Development & MONARCH Integration',
  },
  {
    name: 'University of Illinois',
    logo: '/logos/Illinois.JPEG',
    desc: 'CAMP Co-Development',
  },
  {
    name: 'Texas A&M University',
    logo: '/logos/TAMU.JPEG',
    desc: 'Senior Computer Science Capstone program',
  },
  {
    name: 'European Union Horizon 2020',
    logo: '/logos/EuroPeanUnion.JPEG',
    desc: 'Marie Sklodowska-Curie Grant No 747048',
  },
]

/**
 * AboutPage Component
 * Background on MusicBox, the frameworks it is built on, and its sponsors
 */
function AboutPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>About MusicBox</CardTitle>
          <CardDescription>An atmospheric box model built on MUSICA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink">
          <p>
            MusicBox is a component of MUSICA (Multi-Scale Infrastructure for Chemistry and
            Aerosols) at the National Center for Atmospheric Research&rsquo;s Atmospheric Chemistry
            Observations and Modeling Laboratory.
          </p>
          <p>
            MUSICA will become a computationally feasible global modeling framework that allows for
            the simulation of large-scale atmospheric phenomena, while still resolving chemistry at
            emission and exposure relevant scales (down to ~4 km within the next 5 years).
          </p>
          <p>
            The Model-Independent Chemistry Module (MICM) is also developed at NCAR-ACOM and can
            bring MusicBox mechanisms you develop here to high-performance weather and climate
            models.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-location/60 bg-[#FFFBEB] p-3 text-sm">
        <AlertCircle className="w-5 h-5 text-location flex-shrink-0 mt-0.5" />
        <p className="text-ink">
          <strong>Note:</strong> MusicBox is currently being tested and is under active
          development. Features and documentation are continuously being updated.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>CAMP</CardTitle>
            <CardDescription>Chemistry Across Multiple Phases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ink">
            <p>
              A run-time configured chemical system solver for gas- and condensed-phase reactions.
              CAMP provides flexibility and performance for complex atmospheric chemistry
              simulations.
            </p>
            <p className="text-muted">
              Developed by: Barcelona Supercomputing Center (BSC) and University of Illinois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>MICM</CardTitle>
            <CardDescription>Model-Independent Chemistry Module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ink">
            <p>
              Designed to bring flexibility for chemical systems to high-performance weather and
              climate models. MICM enables efficient chemistry integration across multiple modeling
              platforms.
            </p>
            <p className="text-muted">Developed by: National Center for Atmospheric Research (NCAR)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collaboration &amp; Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.name}
                className="flex flex-col items-center text-center p-3 border border-border rounded-lg"
              >
                <img
                  src={sponsor.logo}
                  alt={sponsor.name}
                  className="h-12 w-full object-contain mb-2"
                />
                <p className="text-xs font-semibold text-ink">{sponsor.name}</p>
                <p className="text-xs text-muted mt-0.5">{sponsor.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutPage
