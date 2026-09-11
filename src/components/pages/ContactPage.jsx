import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'
import { useToast } from '@/hooks/use-toast'

const TEXT_INPUT =
  'w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent'

const SUPPORT_EMAIL = 'support@musicbox.ncar.edu'

/**
 * ContactPage Component
 * A contact form and reach-out information for MusicBox Interactive
 */
function ContactPage() {
  const { toast } = useToast()

  const handleSubmit = (e) => {
    e.preventDefault()
    const form = e.target
    const data = new FormData(form)
    const name = data.get('name').trim()
    const email = data.get('email').trim()
    const subject = data.get('subject').trim() || 'MusicBox Interactive Contact Form'
    const message = data.get('message').trim()

    if (!name || !email || !message) {
      toast({
        title: 'Missing Information',
        description: 'Fill in your name, email, and a message before sending.',
        variant: 'destructive',
      })
      return
    }

    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    toast({
      title: 'Opening Your Email Client',
      description: `Your message is ready to send to ${SUPPORT_EMAIL}. Finish sending it from there.`,
    })
    form.reset()
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <CardDescription>Have questions or feedback? We&rsquo;d love to hear from you.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="contact-name" className="block text-sm font-semibold text-ink mb-1">
                Name
              </label>
              <input
                id="contact-name"
                name="name"
                type="text"
                className={TEXT_INPUT}
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-ink mb-1">
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                className={TEXT_INPUT}
                placeholder="your.email@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-subject" className="block text-sm font-semibold text-ink mb-1">
                Subject
              </label>
              <input
                id="contact-subject"
                name="subject"
                type="text"
                className={TEXT_INPUT}
                placeholder="What is this about?"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-sm font-semibold text-ink mb-1">
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={6}
                className={`${TEXT_INPUT} resize-none`}
                placeholder="Your message..."
                required
              ></textarea>
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Send Message
            </Button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
            <div>
              <h3 className="text-sm font-semibold text-heading mb-1">Email</h3>
              <p className="text-sm text-ink">{SUPPORT_EMAIL}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-heading mb-1">Location</h3>
              <p className="text-sm text-ink">
                National Center for Atmospheric Research
                <br />
                Boulder, Colorado, USA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ContactPage
