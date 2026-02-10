"use client";

import { useEffect, useRef, PropsWithChildren } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

export function PhotoSwipeClient({
    children,
    galleryId = "gallery",
}: PropsWithChildren<{
    galleryId?: string;
}>) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);

    useEffect(() => {
        if (!rootRef.current) return;

        // Initialize PhotoSwipe lightbox
        // Only bind to image links (those with data-pswp-width attribute)
        const lightbox = new PhotoSwipeLightbox({
            gallery: rootRef.current,
            children: "a[data-pswp-width]",
            pswpModule: () => import("photoswipe"),
        });

        lightbox.init();
        lightboxRef.current = lightbox;

        return () => {
            lightbox.destroy();
            lightboxRef.current = null;
        };
    }, []);

    return <div ref={rootRef}>{children}</div>;
}
