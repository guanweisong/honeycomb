"use client";

import { useEffect, useRef, PropsWithChildren } from "react";
import PhotoSwipeLightbox from "photoswipe/lightbox";
import "photoswipe/style.css";

export function PhotoSwipeClient({
    children,
}: PropsWithChildren<{
    galleryId?: string;
}>) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const lightboxRef = useRef<PhotoSwipeLightbox | null>(null);

    useEffect(() => {
        if (!rootRef.current) return;

        // 初始化 PhotoSwipe 灯箱交互。
        // 只绑定带有 data-pswp-width 属性的图片链接。
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
/**
 * PhotoSwipe 客户端组件，负责为文章图片提供浏览交互。
 */
