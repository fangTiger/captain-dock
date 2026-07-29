import Image from 'next/image'

import type { Project } from '../../content/types'

import { getProjectMediaAsset } from './project-media'
import styles from './project-case-study.module.css'

type ProjectGalleryProps = Readonly<{
  gallery: Project['gallery']
}>

export function ProjectGallery({ gallery }: ProjectGalleryProps) {
  return (
    <section aria-labelledby="visual-exhibit-heading" className={styles.gallerySection}>
      <div className={styles.innerHeader}>
        <h3 className={styles.innerTitle} id="visual-exhibit-heading">
          Interface evidence
        </h3>
      </div>

      <div className={styles.galleryGrid}>
        {gallery.map((image, index) => (
          <figure className={styles.galleryFigure} key={image.src}>
            <Image
              alt={image.alt}
              className={styles.galleryImage}
              fetchPriority={index === 0 ? 'low' : undefined}
              loading={index === 0 ? 'eager' : 'lazy'}
              sizes="(min-width: 1180px) 920px, (min-width: 820px) calc(100vw - 12rem), calc(100vw - 7rem)"
              src={getProjectMediaAsset(image.src)}
            />
            <figcaption className={styles.galleryCaption}>
              <details
                aria-label={`Media notes for ${image.alt}`}
                className={styles.mediaNotes}
              >
                <summary>Media notes</summary>
                <p>{image.caption}</p>
              </details>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
