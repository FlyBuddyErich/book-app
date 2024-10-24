import React, { useState, useEffect, createContext, useContext } from 'react'
import { Moon, Sun, Search, Github } from 'lucide-react'
import DOMPurify from 'dompurify'

import logo from './assets/logoipsum-293.svg'


type Theme = 'light' | 'dark'
const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => { },
})


const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}


const useTheme = () => useContext(ThemeContext)


const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) => (
  <button
    {...props}
    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
  >
    {children}
  </button>
)


const Dialog: React.FC<{ open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }> = ({ open, onOpenChange, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-background text-foreground w-full max-w-3xl rounded-lg shadow-lg">
        {children}
      </div>
    </div>
  )
}

const DialogContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-6">{children}</div>
)

const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-4">{children}</div>
)

const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-2xl font-bold">{children}</h2>
)

const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-muted-foreground">{children}</p>
)

interface Book {
  id: string
  title: string
  authors?: string[]
  description?: string
  thumbnail?: string
  previewLink?: string
  isFullyViewable?: boolean
}

interface BookContent {
  pages: string[]
  currentPage: number
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button onClick={toggleTheme}>
      {theme === 'light' ? (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

function SearchInput({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="flex">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for books..."
          className="flex-grow px-4 py-2 border border-input bg-background text-foreground rounded-l-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button type="submit" className="rounded-l-none">
          <Search className='inline-block pr-2 w-6' />
          Search
        </Button>
      </div>
    </form>
  )
}

function BookList({ books, onBookClick }: { books: Book[], onBookClick: (book: Book) => void }) {
  if (books.length === 0) {
    return <div className="text-center">No books found.</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => (
        <div
          key={book.id}
          className="bg-card text-card-foreground rounded-lg shadow-md overflow-hidden cursor-pointer transition-transform hover:scale-105"
          onClick={() => onBookClick(book)}
        >
          <img
            src={book.thumbnail || '/placeholder.svg?height=200&width=150'}
            alt={book.title}
            className="w-full h-48 object-contain"
          />
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">{book.title}</h2>
            <p className="text-muted-foreground mb-2">{book.authors?.join(', ') || 'Unknown Author'}</p>
            <p className="text-foreground line-clamp-3">{book.description || 'No description available.'}</p>
            {book.isFullyViewable && (
              <p className="text-green-600 mt-2">Full book available</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function BookReader({ book, onClose }: { book: Book | null, onClose: () => void }) {
  const [bookContent, setBookContent] = useState<BookContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (book) {
      setLoading(true)
      setError(null)


      const cachedContent = localStorage.getItem(`book_${book.id}`)
      if (cachedContent) {
        setBookContent(JSON.parse(cachedContent))
        setLoading(false)
        return
      }


      fetch(`https://www.googleapis.com/books/v1/volumes/${book.id}`)
        .then(response => response.json())
        .then(data => {
          if (data.accessInfo.viewability === 'ALL_PAGES') {
            return fetchFullBookContent(book.id)
          } else {
            return { pages: [data.volumeInfo.description || 'No preview available.'], currentPage: 0 }
          }
        })
        .then(content => {
          setBookContent(content)
          localStorage.setItem(`book_${book.id}`, JSON.stringify(content))
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching book content:', err)
          setError('Failed to load book content. Please try again later.')
          setLoading(false)
        })
    }
  }, [book])

  const fetchFullBookContent = async (bookId: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}?fields=volumeInfo(description,pageCount)`)
      const data = await response.json()

      if (data.volumeInfo.pageCount) {
        const pages = await Promise.all(
          Array.from({ length: data.volumeInfo.pageCount }, (_, i) =>
            fetch(`https://www.googleapis.com/books/v1/volumes/${bookId}/pages?page=${i + 1}`)
              .then(res => res.text())
          )
        )
        return { pages, currentPage: 0 }
      } else {
        return { pages: [data.volumeInfo.description || 'Full content not available.'], currentPage: 0 }
      }
    } catch (error) {
      console.error('Error fetching full book content:', error)
      throw error
    }
  }

  if (!book) return null

  return (
    <Dialog open={!!book} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{book.title}</DialogTitle>
          <DialogDescription>{book.authors?.join(', ') || 'Unknown Author'}</DialogDescription>
        </DialogHeader>
        <div className="mt-4 h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-destructive">{error}</div>
          ) : bookContent ? (
            <div>
              <div
                className="mb-4"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(bookContent.pages[bookContent.currentPage])
                }}
              />
            </div>
          ) : (
            <div>No content available.</div>
          )}
        </div>
        <div className="flex justify-between items-center mt-4">
          <Button onClick={onClose}>Close</Button>
          {book.previewLink && (
            <a href={book.previewLink} target="_blank" rel="noopener noreferrer">
              <Button>View on Google Books</Button>
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=21`
      )
      const data = await response.json()
      setBooks(data.items?.map((item: any) => ({
        id: item.id,
        title: item.volumeInfo.title,
        authors: item.volumeInfo.authors,
        description: item.volumeInfo.description,
        thumbnail: item.volumeInfo.imageLinks?.thumbnail,
        previewLink: item.volumeInfo.previewLink,
        isFullyViewable: item.accessInfo.viewability === 'ALL_PAGES'
      })) || [])
    } catch (error) {
      console.error('Error fetching books:', error)
      setBooks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookClick = (book: Book) => {
    setSelectedBook(book)
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">
              <img src={logo} alt="" className='inline-block mr-2 mb-1 cursor-pointer' onClick={() => location.reload()} />
              LitQuest
              <p className='text-sm font-medium'>Book Search App</p>
            </h1>
            <ThemeToggle />
          </div>
          <SearchInput onSearch={handleSearch} />
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
          ) : (
            <BookList books={books} onBookClick={handleBookClick} />
          )}
          <BookReader book={selectedBook} onClose={() => setSelectedBook(null)} />
        </div>
        <div className="fixed bottom-4 right-4">
          <a href="https://github.com/FlyBuddyErich" target="_blank" rel="noopener noreferrer">
            <Github className="h-8 w-8 text-gray-600 hover:text-gray-800 transition-colors" />
          </a>
        </div>
        <div className='flex items-center justify-center p-10'>
          <p>This website is using <a href="https://books.google.com/" target="_blank" rel="noopener noreferrer">Google Books API.</a></p>
        </div>
      </div>
    </ThemeProvider>
  )
}