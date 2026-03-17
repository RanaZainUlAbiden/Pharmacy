using System;
using System.Drawing;
using System.Drawing.Drawing2D;

namespace MedicineShop.UI
{
    public static class GraphicsExtensions
    {
        /// <summary>
        /// Fills a rounded rectangle on the specified Graphics surface
        /// </summary>
        public static void FillRoundedRectangle(this Graphics graphics, Brush brush, Rectangle rect, int cornerRadius)
        {
            if (graphics == null) throw new ArgumentNullException(nameof(graphics));
            if (brush == null) throw new ArgumentNullException(nameof(brush));

            using (GraphicsPath path = CreateRoundedRectanglePath(rect, cornerRadius))
            {
                graphics.FillPath(brush, path);
            }
        }

        /// <summary>
        /// Draws a rounded rectangle outline on the specified Graphics surface
        /// </summary>
        public static void DrawRoundedRectangle(this Graphics graphics, Pen pen, Rectangle rect, int cornerRadius)
        {
            if (graphics == null) throw new ArgumentNullException(nameof(graphics));
            if (pen == null) throw new ArgumentNullException(nameof(pen));

            using (GraphicsPath path = CreateRoundedRectanglePath(rect, cornerRadius))
            {
                graphics.DrawPath(pen, path);
            }
        }

        /// <summary>
        /// Creates a GraphicsPath for a rounded rectangle
        /// </summary>
        private static GraphicsPath CreateRoundedRectanglePath(Rectangle rect, int cornerRadius)
        {
            GraphicsPath path = new GraphicsPath();

            // Ensure corner radius doesn't exceed rectangle dimensions
            int actualRadius = Math.Min(cornerRadius, Math.Min(rect.Width / 2, rect.Height / 2));
            int diameter = actualRadius * 2;

            // Handle special cases
            if (actualRadius <= 0)
            {
                path.AddRectangle(rect);
                return path;
            }

            // Create rounded rectangle path
            // Top-left arc
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);

            // Top line
            path.AddLine(rect.X + actualRadius, rect.Y, rect.Right - actualRadius, rect.Y);

            // Top-right arc
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);

            // Right line
            path.AddLine(rect.Right, rect.Y + actualRadius, rect.Right, rect.Bottom - actualRadius);

            // Bottom-right arc
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);

            // Bottom line
            path.AddLine(rect.Right - actualRadius, rect.Bottom, rect.X + actualRadius, rect.Bottom);

            // Bottom-left arc
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);

            // Left line
            path.AddLine(rect.X, rect.Bottom - actualRadius, rect.X, rect.Y + actualRadius);

            path.CloseFigure();
            return path;
        }

        /// <summary>
        /// Alternative method using RectangleF for more precise positioning
        /// </summary>
        public static void FillRoundedRectangle(this Graphics graphics, Brush brush, RectangleF rect, float cornerRadius)
        {
            if (graphics == null) throw new ArgumentNullException(nameof(graphics));
            if (brush == null) throw new ArgumentNullException(nameof(brush));

            using (GraphicsPath path = CreateRoundedRectanglePath(rect, cornerRadius))
            {
                graphics.FillPath(brush, path);
            }
        }

        /// <summary>
        /// Alternative method using RectangleF for more precise positioning
        /// </summary>
        public static void DrawRoundedRectangle(this Graphics graphics, Pen pen, RectangleF rect, float cornerRadius)
        {
            if (graphics == null) throw new ArgumentNullException(nameof(graphics));
            if (pen == null) throw new ArgumentNullException(nameof(pen));

            using (GraphicsPath path = CreateRoundedRectanglePath(rect, cornerRadius))
            {
                graphics.DrawPath(pen, path);
            }
        }

        /// <summary>
        /// Creates a GraphicsPath for a rounded rectangle using RectangleF
        /// </summary>
        private static GraphicsPath CreateRoundedRectanglePath(RectangleF rect, float cornerRadius)
        {
            GraphicsPath path = new GraphicsPath();

            // Ensure corner radius doesn't exceed rectangle dimensions
            float actualRadius = Math.Min(cornerRadius, Math.Min(rect.Width / 2, rect.Height / 2));
            float diameter = actualRadius * 2;

            // Handle special cases
            if (actualRadius <= 0)
            {
                path.AddRectangle(rect);
                return path;
            }

            // Create rounded rectangle path
            // Top-left arc
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);

            // Top line
            path.AddLine(rect.X + actualRadius, rect.Y, rect.Right - actualRadius, rect.Y);

            // Top-right arc
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);

            // Right line
            path.AddLine(rect.Right, rect.Y + actualRadius, rect.Right, rect.Bottom - actualRadius);

            // Bottom-right arc
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);

            // Bottom line
            path.AddLine(rect.Right - actualRadius, rect.Bottom, rect.X + actualRadius, rect.Bottom);

            // Bottom-left arc
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);

            // Left line
            path.AddLine(rect.X, rect.Bottom - actualRadius, rect.X, rect.Y + actualRadius);

            path.CloseFigure();
            return path;
        }
    }
}