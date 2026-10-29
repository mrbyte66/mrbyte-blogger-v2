package com.satir.media.application;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.w3c.dom.Node;

import com.satir.media.domain.ImageInspection;

/**
 * Re-encodes a (possibly animated) GIF: every frame is composited onto the logical screen with its
 * offset and disposal, then written again as a full frame with only its delay and a loop extension.
 * Comments, unknown extensions and anything after the image data are dropped.
 */
final class GifReencoder {

    static final int MAX_FRAMES = 300;
    /** Pixels of all frames together; keeps decoding work bounded for long or large animations. */
    static final long MAX_TOTAL_PIXELS = 150_000_000L;

    private GifReencoder() {
    }

    static byte[] reencode(byte[] bytes) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName("gif");
            if (!readers.hasNext()) {
                throw new IOException("no gif reader");
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, false, false);
                int frames = reader.getNumImages(true);
                int[] screen = screenSize(reader);
                int width = screen[0], height = screen[1];
                if (frames < 1) {
                    throw new IOException("no frames");
                }
                if (!ImageInspection.withinPixelLimit(width, height)) {
                    throw new LimitException("MEDIA_TOO_MANY_PIXELS", "Görsel en fazla 20 megapiksel olabilir");
                }
                if (frames > MAX_FRAMES || (long) width * height * frames > MAX_TOTAL_PIXELS) {
                    throw new LimitException("MEDIA_TOO_MANY_FRAMES", "Hareketli görsel en fazla " + MAX_FRAMES
                            + " kare ve makul bir boyutta olabilir");
                }
                return write(reader, frames, width, height);
            } finally {
                reader.dispose();
            }
        }
    }

    private static byte[] write(ImageReader reader, int frames, int width, int height) throws IOException {
        BufferedImage canvas = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        ImageWriter writer = ImageIO.getImageWritersByFormatName("gif").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(output);
            writer.prepareWriteSequence(null);
            for (int i = 0; i < frames; i++) {
                Frame frame = frame(reader.getImageMetadata(i));
                if (!ImageInspection.withinPixelLimit(frame.width, frame.height)) {
                    throw new LimitException("MEDIA_TOO_MANY_PIXELS", "Görsel en fazla 20 megapiksel olabilir");
                }
                BufferedImage previous = "restoreToPrevious".equals(frame.disposal) ? copy(canvas) : null;
                Graphics2D g = canvas.createGraphics();
                g.drawImage(reader.read(i), frame.left, frame.top, null);
                g.dispose();
                BufferedImage shown = copy(canvas);
                writer.writeToSequence(new IIOImage(shown, null, metadata(writer, shown, frame.delay, frames > 1)), null);
                if ("restoreToBackgroundColor".equals(frame.disposal)) {
                    Graphics2D clear = canvas.createGraphics();
                    clear.setComposite(java.awt.AlphaComposite.Clear);
                    clear.fillRect(frame.left, frame.top, frame.width, frame.height);
                    clear.dispose();
                } else if (previous != null) {
                    canvas = previous;
                }
            }
            writer.endWriteSequence();
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }

    private record Frame(int left, int top, int width, int height, String disposal, int delay) {
    }

    private static Frame frame(IIOMetadata metadata) {
        Node root = metadata.getAsTree("javax_imageio_gif_image_1.0");
        int left = 0, top = 0, width = 0, height = 0, delay = 10;
        String disposal = "none";
        for (Node child = root.getFirstChild(); child != null; child = child.getNextSibling()) {
            IIOMetadataNode node = (IIOMetadataNode) child;
            if ("ImageDescriptor".equals(node.getNodeName())) {
                left = Integer.parseInt(node.getAttribute("imageLeftPosition"));
                top = Integer.parseInt(node.getAttribute("imageTopPosition"));
                width = Integer.parseInt(node.getAttribute("imageWidth"));
                height = Integer.parseInt(node.getAttribute("imageHeight"));
            } else if ("GraphicControlExtension".equals(node.getNodeName())) {
                disposal = node.getAttribute("disposalMethod");
                delay = Math.max(2, Integer.parseInt(node.getAttribute("delayTime")));
            }
        }
        return new Frame(left, top, width, height, disposal, delay);
    }

    private static IIOMetadata metadata(ImageWriter writer, BufferedImage image, int delay, boolean loop) throws IOException {
        IIOMetadata metadata = writer.getDefaultImageMetadata(ImageTypeSpecifier.createFromRenderedImage(image), null);
        String format = metadata.getNativeMetadataFormatName();
        IIOMetadataNode root = (IIOMetadataNode) metadata.getAsTree(format);
        IIOMetadataNode control = child(root, "GraphicControlExtension");
        control.setAttribute("disposalMethod", "none");
        control.setAttribute("userInputFlag", "FALSE");
        control.setAttribute("delayTime", Integer.toString(delay));
        if (loop) {
            IIOMetadataNode extensions = child(root, "ApplicationExtensions");
            IIOMetadataNode netscape = new IIOMetadataNode("ApplicationExtension");
            netscape.setAttribute("applicationID", "NETSCAPE");
            netscape.setAttribute("authenticationCode", "2.0");
            netscape.setUserObject(new byte[] {1, 0, 0});
            extensions.appendChild(netscape);
        }
        metadata.setFromTree(format, root);
        return metadata;
    }

    private static IIOMetadataNode child(IIOMetadataNode root, String name) {
        for (Node child = root.getFirstChild(); child != null; child = child.getNextSibling()) {
            if (name.equals(child.getNodeName())) {
                return (IIOMetadataNode) child;
            }
        }
        IIOMetadataNode node = new IIOMetadataNode(name);
        root.appendChild(node);
        return node;
    }

    private static int[] screenSize(ImageReader reader) throws IOException {
        IIOMetadata stream = reader.getStreamMetadata();
        if (stream != null) {
            Node root = stream.getAsTree("javax_imageio_gif_stream_1.0");
            for (Node child = root.getFirstChild(); child != null; child = child.getNextSibling()) {
                if ("LogicalScreenDescriptor".equals(child.getNodeName())) {
                    IIOMetadataNode node = (IIOMetadataNode) child;
                    int width = Integer.parseInt(node.getAttribute("logicalScreenWidth"));
                    int height = Integer.parseInt(node.getAttribute("logicalScreenHeight"));
                    if (width > 0 && height > 0) {
                        return new int[] {width, height};
                    }
                }
            }
        }
        return new int[] {reader.getWidth(0), reader.getHeight(0)};
    }

    private static BufferedImage copy(BufferedImage source) {
        BufferedImage copy = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = copy.createGraphics();
        g.drawImage(source, 0, 0, null);
        g.dispose();
        return copy;
    }

    /** A size limit the caller reports with its own code. */
    static final class LimitException extends IOException {
        final String code;

        LimitException(String code, String message) {
            super(message);
            this.code = code;
        }
    }
}
