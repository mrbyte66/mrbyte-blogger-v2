package com.satir.media.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageTypeSpecifier;
import javax.imageio.ImageWriter;
import javax.imageio.metadata.IIOMetadata;
import javax.imageio.metadata.IIOMetadataNode;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;

import org.junit.jupiter.api.Test;

public class GifReencoderTest {

    /** An animated GIF whose later frames are small patches at an offset, with a comment extension. */
    public static byte[] animated(int frames, int size) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("gif").next();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(output);
            writer.prepareWriteSequence(null);
            for (int i = 0; i < frames; i++) {
                int edge = i == 0 ? size : Math.max(1, size / 4);
                BufferedImage image = new BufferedImage(edge, edge, BufferedImage.TYPE_INT_RGB);
                image.setRGB(0, 0, i % 2 == 0 ? 0xFF0000 : 0x00FF00);
                IIOMetadata metadata = writer.getDefaultImageMetadata(ImageTypeSpecifier.createFromRenderedImage(image), null);
                String format = metadata.getNativeMetadataFormatName();
                IIOMetadataNode root = (IIOMetadataNode) metadata.getAsTree(format);
                IIOMetadataNode descriptor = (IIOMetadataNode) root.getElementsByTagName("ImageDescriptor").item(0);
                descriptor.setAttribute("imageLeftPosition", Integer.toString(i == 0 ? 0 : size / 2));
                descriptor.setAttribute("imageTopPosition", Integer.toString(i == 0 ? 0 : size / 2));
                IIOMetadataNode control = new IIOMetadataNode("GraphicControlExtension");
                control.setAttribute("disposalMethod", "doNotDispose");
                control.setAttribute("userInputFlag", "FALSE");
                control.setAttribute("transparentColorFlag", "FALSE");
                control.setAttribute("delayTime", "7");
                control.setAttribute("transparentColorIndex", "0");
                root.appendChild(control);
                IIOMetadataNode comments = new IIOMetadataNode("CommentExtensions");
                IIOMetadataNode comment = new IIOMetadataNode("CommentExtension");
                comment.setAttribute("value", "gizli-not");
                comments.appendChild(comment);
                root.appendChild(comments);
                metadata.setFromTree(format, root);
                writer.writeToSequence(new IIOImage(image, null, metadata), null);
            }
            writer.endWriteSequence();
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }

    @Test
    void keepsEveryFrameAsAFullFrameWithItsDelayAndDropsComments() throws IOException {
        byte[] clean = GifReencoder.reencode(animated(3, 40));
        assertThat(new String(clean, StandardCharsets.ISO_8859_1)).doesNotContain("gizli-not").contains("NETSCAPE2.0");
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(clean))) {
            ImageReader reader = ImageIO.getImageReadersByFormatName("gif").next();
            reader.setInput(input);
            assertThat(reader.getNumImages(true)).isEqualTo(3);
            for (int i = 0; i < 3; i++) {
                BufferedImage frame = reader.read(i);
                assertThat(frame.getWidth()).isEqualTo(40);
                assertThat(frame.getHeight()).isEqualTo(40);
                IIOMetadataNode root = (IIOMetadataNode) reader.getImageMetadata(i).getAsTree("javax_imageio_gif_image_1.0");
                IIOMetadataNode control = (IIOMetadataNode) root.getElementsByTagName("GraphicControlExtension").item(0);
                assertThat(control.getAttribute("delayTime")).isEqualTo("7");
            }
            // The first frame's pixel survives under the later patches (doNotDispose composites).
            assertThat(reader.read(2).getRGB(0, 0) & 0xFFFFFF).isEqualTo(0xFF0000);
            reader.dispose();
        }
    }

    @Test
    void refusesTooManyFrames() throws IOException {
        byte[] long_ = animated(GifReencoder.MAX_FRAMES + 1, 4);
        assertThatThrownBy(() -> GifReencoder.reencode(long_))
                .isInstanceOf(GifReencoder.LimitException.class)
                .satisfies(e -> assertThat(((GifReencoder.LimitException) e).code).isEqualTo("MEDIA_TOO_MANY_FRAMES"));
    }
}
