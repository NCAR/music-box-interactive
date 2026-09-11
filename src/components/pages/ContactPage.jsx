import { Button } from '../ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card'

const TEXT_INPUT =
  'w-full px-3 py-2 border border-border rounded-lg text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent'

/**
 * ContactPage Component
 * A contact form and reach-out information for MusicBox Interactive
 */
function ContactPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
          <CardDescription>Have questions or feedback? We&rsquo;d love to hear from you.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4 max-w-xl" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="contact-name" className="block text-sm font-semibold text-ink mb-1">
                Name
              </label>
              <input id="contact-name" type="text" className={TEXT_INPUT} placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-sm font-semibold text-ink mb-1">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                className={TEXT_INPUT}
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label htmlFor="contact-subject" className="block text-sm font-semibold text-ink mb-1">
                Subject
              </label>
              <input
                id="contact-subject"
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
                rows={6}
                className={`${TEXT_INPUT} resize-none`}
                placeholder="Your message..."
              ></textarea>
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Send Message
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-heading mb-1">Email</h3>
            <p className="text-sm text-ink">support@musicbox.ncar.edu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold text-heading mb-1">Location</h3>
            <p className="text-sm text-ink">
              National Center for Atmospheric Research
              <br />
              Boulder, Colorado, USA
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ContactPage
