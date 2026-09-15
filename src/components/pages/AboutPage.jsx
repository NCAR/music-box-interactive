import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// lucide-react's Github icon is deprecated (github.com/lucide-icons/lucide/issues/670),
// so the mark is inlined here instead.
function GithubMark(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .3.21.66.79.55A10.52 10.52 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  )
}

// Sponsors data
const sponsors = [
  { name: 'National Science Foundation', logo: '/logos/NSF.png', desc: 'Award NSF-AGS 19 41110' },
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
  {
    name: 'Barcelona Supercomputing Center',
    logo: '/logos/BSC.JPEG',
    desc: 'Supported early MusicBox development with CAMP',
  },
  {
    name: 'University of Illinois',
    logo: '/logos/Illinois.JPEG',
    desc: 'Supported early MusicBox development with CAMP',
  },
]

// Milestones from the MusicBox release history (github.com/NCAR/music-box)
const timeline = [
  { year: '2020', text: 'The MusicBox and MusicBox Interactive projects begin development at ACOM.' },
  { year: '2021', text: 'MusicBox reaches its first stable release, v1.0.0.' },
  {
    year: '2024',
    text: 'Version 2.2.0 adds a Python implementation of MusicBox, published to PyPI as acom_music_box.',
  },
  {
    year: '2026',
    text: 'Version 3.0.0 adds a JavaScript implementation of MusicBox alongside the existing Python code.',
  },
]

function GithubLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} GitHub repository`}
      className="text-muted hover:text-action-hover"
    >
      <GithubMark className="w-4 h-4" />
    </a>
  )
}

/**
 * AboutPage Component
 * Background on MusicBox, the frameworks it is built on, and its sponsors
 */
function AboutPage() {
  const { toast } = useToast()

  const handleCopyInstallCommand = async (command) => {
    try {
      await navigator.clipboard.writeText(command)
      toast({
        title: 'Copied to Clipboard!',
        description: `"${command}" has been copied to your clipboard.`,
      })
    } catch (_error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy the command to your clipboard.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>MusicBox</CardTitle>
            <GithubLink href="https://github.com/NCAR/music-box" label="MusicBox" />
          </div>
          <CardDescription>An atmospheric chemistry box model built on MUSICA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink">
          <p>
            MusicBox is an atmospheric chemistry box model developed at the National Center for
            Atmospheric Research&rsquo;s Atmospheric Chemistry Observations and Modeling
            Laboratory. MusicBox has both Python and JavaScript implementations.
          </p>
          <p>
            MusicBox is built on MUSICA (Multi-Scale Infrastructure for Chemistry and Aerosols),
            and uses the Model-Independent Chemistry Module (MICM) as its ODE solver.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono bg-black/5 border border-border rounded px-2 py-1">
              <code>pip install acom_music_box</code>
              <button
                type="button"
                onClick={() => handleCopyInstallCommand('pip install acom_music_box')}
                className="text-muted hover:text-action-hover"
                aria-label="Copy pip install command to clipboard"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono bg-black/5 border border-border rounded px-2 py-1">
              <code>npm install @ncar/music-box</code>
              <button
                type="button"
                onClick={() => handleCopyInstallCommand('npm install @ncar/music-box')}
                className="text-muted hover:text-action-hover"
                aria-label="Copy npm install command to clipboard"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="pt-1">
            <h4 className="text-xs font-semibold text-heading uppercase tracking-wide mb-2">
              History
            </h4>
            <div>
              {timeline.map((item, index) => (
                <div key={item.year} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-action mt-1 flex-shrink-0" />
                    {index < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className={index < timeline.length - 1 ? 'pb-3' : ''}>
                    <p className="text-xs font-semibold text-heading">{item.year}</p>
                    <p className="text-sm text-ink">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-1 border-t border-border">
            <div className="flex items-center gap-2 mb-1 pt-3">
              <h4 className="text-sm font-semibold text-heading">MusicBox Interactive</h4>
              <GithubLink
                href="https://github.com/NCAR/music-box-interactive"
                label="MusicBox Interactive"
              />
            </div>
            <p>
              MusicBox Interactive, the application you are using now, is a separate but related
              product from MusicBox: a web interface that runs MusicBox in the browser, so you can
              build a mechanism, configure conditions, and run a simulation without installing
              anything. MusicBox itself remains a standalone Python and JavaScript package for
              users who want to run it programmatically or embed it in another tool.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>MUSICA</CardTitle>
              <GithubLink href="https://github.com/NCAR/musica" label="MUSICA" />
            </div>
            <CardDescription>Multi-Scale Infrastructure for Chemistry and Aerosols</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ink">
            <p>
              The framework MusicBox is built on. MUSICA lets a single chemistry configuration run
              across box models, column models, and global models.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono bg-black/5 border border-border rounded px-2 py-1">
                <code>pip install musica</code>
                <button
                  type="button"
                  onClick={() => handleCopyInstallCommand('pip install musica')}
                  className="text-muted hover:text-action-hover"
                  aria-label="Copy pip install command to clipboard"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <a
              href="https://ncar.github.io/musica/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-action hover:text-action-hover font-medium underline"
            >
              MUSICA Documentation
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>MICM</CardTitle>
              <GithubLink href="https://github.com/NCAR/micm" label="MICM" />
            </div>
            <CardDescription>Model-Independent Chemistry Module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-ink">
            <p>
              The ODE solver MusicBox uses to integrate chemical kinetics. MICM is designed to bring
              flexibility for chemical systems to high-performance weather and climate models, and
              enables efficient chemistry integration across multiple modeling platforms.
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>CAMP</CardTitle>
            <GithubLink href="https://github.com/open-atmos/camp" label="CAMP" />
          </div>
          <CardDescription>Chemistry Across Multiple Phases</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink">
          <p>
            The Barcelona Supercomputing Center and the University of Illinois supported the early
            development of MusicBox. That early version of MusicBox relied on CAMP, a chemistry
            solver for gas and aerosol phase chemistry.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default AboutPage
