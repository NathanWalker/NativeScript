/*
 * Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.nativescript.widgets;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.text.TextUtils;
import android.util.AttributeSet;
import android.util.SparseArray;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.ImageView.ScaleType;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;

public class BottomNavigationBar extends LinearLayout {
    /**
     * Allows complete control over the colors drawn in the tab layout. Set with
     * {@link #setCustomTabColorizer(TabColorizer)}.
     */
    public interface TabColorizer {

        /**
         * @return return the color of the indicator used when {@code position}
         * is selected.
         */
        int getIndicatorColor(int position);

    }

    private static final int BOTTOM_NAV_HEIGHT = 56;
    private static final int ITEM_TEXT_SIZE_SP = 12;
    private static final int ITEM_TEXT_MAX_WIDTH = 144;
    public static int NOTIFICATION_ICON_SIZE = 8;
    public static boolean NOTIFICATION_ICON_SHOW_COUNT = false;
    public static int NOTIFICATION_ICON_COUNT_TEXT_SIZE_SP = 6;
    public static int[] NOTIFICATION_GRADIENT_COLORS;
    public static int NOTIFICATION_GRADIENT_COLOR = Color.RED;
    private TabItemSpec[] mTabItems;
    private SparseArray<String> mContentDescriptions = new SparseArray<String>();

    private final TabStrip mTabStrip;

    public BottomNavigationBar(Context context) {
        this(context, null);
    }

    public BottomNavigationBar(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public BottomNavigationBar(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);

        mTabStrip = new TabStrip(context);
        mTabStrip.setSelectedIndicatorColors(0x00FFFFFF);
        int bottomNavHeight = (int) (BOTTOM_NAV_HEIGHT * getResources().getDisplayMetrics().density);
        addView(mTabStrip, LayoutParams.MATCH_PARENT, bottomNavHeight);
    }

    /**
     * Set the custom {@link TabColorizer} to be used.
     * <p>
     * If you only require simple customisation then you can use
     */
    public void setCustomTabColorizer(TabColorizer tabColorizer) {
//        mTabStrip.setCustomTabColorizer(tabColorizer);
    }

    public void setTabTextColor(int color) {
        mTabStrip.setTabTextColor(color);
    }

    public int getTabTextColor() {
        return mTabStrip.getTabTextColor();
    }

    public void setSelectedTabTextColor(int color) {
        mTabStrip.setSelectedTabTextColor(color);
    }

    public int getSelectedTabTextColor() {
        return mTabStrip.getSelectedTabTextColor();
    }

    public void setTabTextFontSize(float fontSize) {
        mTabStrip.setTabTextFontSize(fontSize);
    }

    public float getTabTextFontSize() {
        return mTabStrip.getTabTextFontSize();
    }

    public float getTabNotificationTextFontSize() {
        return mTabStrip.getTabNotificationTextFontSize();
    }

    public void setTabNotificationTextFontSize(float fontSize) {
        mTabStrip.setTabNotificationTextFontSize(fontSize);
    }

    public void setItems(TabItemSpec[] items) {
        mTabStrip.removeAllViews();
        mTabItems = items;
        populateTabStrip();
    }

    /**
     * Updates the UI of an item at specified index
     */
    public void updateItemAt(int position, TabItemSpec tabItem) {
        LinearLayout ll = (LinearLayout) mTabStrip.getChildAt(position);
        RelativeLayout rl = (RelativeLayout) ll.getChildAt(0);
        ImageView imgView = (ImageView) rl.getChildAt(0);
        TextView textView = (TextView) ll.getChildAt(1);
        this.setupItem(ll, textView, imgView, tabItem);
    }

    /**
     * Gets the TextView for tab item at index
     */
    public TextView getNotificationTextViewForItemAt(int index) {
        LinearLayout ll = this.getViewForItemAt(index);
        if (ll != null) {
            RelativeLayout rl = (RelativeLayout) ll.getChildAt(0);
            RelativeLayout layout = (RelativeLayout) rl.getChildAt(1);
            return (TextView) layout.getChildAt(1);
        }
        return null;
    }


    /**
     * Hide/Show the notification for tab item at index
     */
    public void showNotificationForItemAt(int index, boolean show) {
        LinearLayout ll = this.getViewForItemAt(index);
        if (ll != null) {
            RelativeLayout rl = (RelativeLayout) ll.getChildAt(0);
            RelativeLayout layout = (RelativeLayout) rl.getChildAt(1);
            if (show) {
                layout.setVisibility(View.VISIBLE);
            } else {
                layout.setVisibility(View.INVISIBLE);
            }
        }
    }


    /**
     * Gets the TextView for tab item at index
     */
    public TextView getTextViewForItemAt(int index) {
        LinearLayout ll = this.getViewForItemAt(index);
        return (ll != null) ? (TextView) ll.getChildAt(1) : null;
    }

    /**
     * Gets the LinearLayout container for tab item at index
     */
    public LinearLayout getViewForItemAt(int index) {
        LinearLayout result = null;

        if (this.mTabStrip.getChildCount() > index) {
            result = (LinearLayout) this.mTabStrip.getChildAt(index);
        }

        return result;
    }

    /**
     * Gets the number of realized tabs.
     */
    public int getItemCount() {
        return this.mTabStrip.getChildCount();
    }


    public void updateIconSizeAt(int index, final int size) {
        final LinearLayout layout = getViewForItemAt(index);
        RelativeLayout rl = (RelativeLayout) layout.getChildAt(0);
        final ImageView iconView = (ImageView) rl.getChildAt(0);
        final RelativeLayout icon = (RelativeLayout) rl.getChildAt(1);
        final int width = (int) (size * getResources().getDisplayMetrics().density);
        icon.post(new Runnable() {
            @Override
            public void run() {
                RelativeLayout.LayoutParams old = (RelativeLayout.LayoutParams) icon.getLayoutParams();
                RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                        old.width, old.height
                );
                params.leftMargin = iconView.getWidth();
                icon.setLayoutParams(params);
            }
        });
        iconView.post(new Runnable() {
            @Override
            public void run() {
                RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                        android.widget.RelativeLayout.LayoutParams.WRAP_CONTENT,
                        width
                );
                params.addRule(RelativeLayout.CENTER_VERTICAL);
                params.addRule(RelativeLayout.CENTER_HORIZONTAL);
                iconView.setLayoutParams(params);

            }
        });
    }

    /**
     * Create a default view to be used for tabs.
     */
    protected View createDefaultTabView(Context context, TabItemSpec tabItem) {
        float density = getResources().getDisplayMetrics().density;
        int maxWidth = 0;
        View root = findViewById(android.R.id.content);
        if (root != null) {
            maxWidth = root.getWidth();
        }
        LinearLayout ll = new LinearLayout(context);
        ll.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.MATCH_PARENT));
        ll.setGravity(Gravity.CENTER);
        ll.setOrientation(LinearLayout.VERTICAL);
        TypedValue outValue = new TypedValue();
        getContext().getTheme().resolveAttribute(android.R.attr.selectableItemBackground, outValue, true);
        ll.setBackgroundResource(outValue.resourceId);

        RelativeLayout rl = new RelativeLayout(context);
        rl.setLayoutParams(
                new RelativeLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        );
        ImageView imgView = new ImageView(context);
        imgView.setScaleType(ScaleType.FIT_CENTER);
        RelativeLayout.LayoutParams imgLP = new RelativeLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        imgLP.addRule(RelativeLayout.CENTER_VERTICAL);
        imgLP.addRule(RelativeLayout.CENTER_HORIZONTAL);
        imgView.setLayoutParams(imgLP);
        rl.addView(imgView);


        RelativeLayout notifIcon = new RelativeLayout(context);
        RelativeLayout.LayoutParams notfiLP = new RelativeLayout.LayoutParams(
                (int) (NOTIFICATION_ICON_SIZE * density), (int) (NOTIFICATION_ICON_SIZE * density));
        if (maxWidth > 0) {
            int size = (maxWidth / mTabItems.length) / 2;
            notfiLP.leftMargin = (int) ((size * density) * 0.25);
        }
        notfiLP.topMargin = (int) ((BOTTOM_NAV_HEIGHT * density) * 0.1);
        notifIcon.setLayoutParams(notfiLP);
        notfiLP.addRule(RelativeLayout.ALIGN_PARENT_TOP);
        notfiLP.addRule(RelativeLayout.CENTER_HORIZONTAL);



        GradientDrawable circle = new GradientDrawable();
        circle.setShape(GradientDrawable.OVAL);
        if (NOTIFICATION_GRADIENT_COLORS != null) {
            circle.setColors(NOTIFICATION_GRADIENT_COLORS);
        } else {
            circle.setColor(NOTIFICATION_GRADIENT_COLOR);
        }
        notifIcon.setBackground(circle);
        notifIcon.setVisibility(View.INVISIBLE);


        TextView iconCountTextView = new TextView(context);
        iconCountTextView.setGravity(Gravity.CENTER);
        iconCountTextView.setMaxWidth((int) (NOTIFICATION_ICON_SIZE * density));
        iconCountTextView.setTextSize(TypedValue.COMPLEX_UNIT_SP, NOTIFICATION_ICON_COUNT_TEXT_SIZE_SP);
        iconCountTextView.setTypeface(Typeface.DEFAULT_BOLD);
        iconCountTextView.setEllipsize(TextUtils.TruncateAt.END);
        iconCountTextView.setMaxLines(1);
        iconCountTextView.setLayoutParams(new RelativeLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        notifIcon.addView(iconCountTextView);

        rl.addView(notifIcon);


        TextView textView = new TextView(context);
        textView.setGravity(Gravity.CENTER);
        textView.setMaxWidth((int) (ITEM_TEXT_MAX_WIDTH * density));
        textView.setTextSize(TypedValue.COMPLEX_UNIT_SP, ITEM_TEXT_SIZE_SP);
        textView.setTypeface(Typeface.DEFAULT_BOLD);
        textView.setEllipsize(TextUtils.TruncateAt.END);
        textView.setMaxLines(1);
        textView.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        this.setupItem(ll, textView, imgView, tabItem);

        ll.addView(rl);
        ll.addView(textView);
        return ll;
    }

    private void setupItem(final LinearLayout ll, TextView textView, final ImageView imgView, TabItemSpec tabItem) {
        float density = getResources().getDisplayMetrics().density;

        if (tabItem.iconId != 0) {
            imgView.setImageResource(tabItem.iconId);
            imgView.setVisibility(VISIBLE);
        } else if (tabItem.iconDrawable != null) {
            imgView.setImageDrawable(tabItem.iconDrawable);
            imgView.setVisibility(VISIBLE);
        } else {
            imgView.setVisibility(GONE);
        }

        imgView.post(new Runnable() {
            @Override
            public void run() {
                if (imgView != null) {
                    Drawable drawable = imgView.getDrawable();
                    if (drawable != null) {
                        int width = drawable.getIntrinsicWidth();

                        if (width > 0) {
                            RelativeLayout rl = (RelativeLayout) ll.getChildAt(0);
                            RelativeLayout icon = (RelativeLayout) rl.getChildAt(1);
                            RelativeLayout.LayoutParams old = (RelativeLayout.LayoutParams) icon.getLayoutParams();
                            RelativeLayout.LayoutParams params = new RelativeLayout.LayoutParams(
                                    old.width, old.height
                            );
                            params.leftMargin = imgView.getWidth();
                            icon.setLayoutParams(params);
                        }
                    }
                }

            }
        });
        if (tabItem.title != null && !tabItem.title.isEmpty()) {
            textView.setText(tabItem.title);
            textView.setVisibility(VISIBLE);

            if (tabItem.typeFace != null) {
                textView.setTypeface(tabItem.typeFace);
            }

            if (tabItem.fontSize != 0) {
                textView.setTextSize(tabItem.fontSize);
            }

            if (tabItem.color != 0) {
                textView.setTextColor(tabItem.color);
                mTabStrip.setShouldUpdateTabsTextColor(false);
            }
        } else {
            textView.setVisibility(GONE);
        }

        if (tabItem.backgroundColor != 0) {
            ll.setBackgroundColor(tabItem.backgroundColor);
        }

        ll.setMinimumHeight((int) (BOTTOM_NAV_HEIGHT * density));

        LinearLayout.LayoutParams lp = (LinearLayout.LayoutParams) ll.getLayoutParams();
        lp.width = 0;
        lp.weight = 1;
    }

    public boolean onTap(int position) {
        // to be overridden in JS
        return true;
    }

    public void onSelectedPositionChange(int position, int prevPosition) {
        // to be overridden in JS
    }

    private void populateTabStrip() {
        final OnClickListener tabClickListener = new TabClickListener();

        if (this.mTabItems != null) {
            int count = this.mTabItems.length < 5 ? this.mTabItems.length : 5;
            for (int i = 0; i < count; i++) {
                View tabView = null;

                TabItemSpec tabItem;
                tabItem = this.mTabItems[i];
                tabView = createDefaultTabView(getContext(), tabItem);
                tabView.setOnClickListener(tabClickListener);

                String desc = mContentDescriptions.get(i, null);
                if (desc != null) {
                    tabView.setContentDescription(desc);
                }

                mTabStrip.addView(tabView);
            }
            int tabTextColor = mTabStrip.getTabTextColor();
            mTabStrip.setTabTextColor(Color.argb(100, Color.red(tabTextColor), Color.green(tabTextColor), Color.blue(tabTextColor)));
            mTabStrip.setSelectedTabTextColor(Color.argb(255, Color.red(tabTextColor), Color.green(tabTextColor), Color.blue(tabTextColor)));
        }
    }

    public void setSelectedPosition(int position) {
        int prevPosition = mTabStrip.getSelectedPosition();
        if (prevPosition == position) {
            return;
        }

        mTabStrip.setSelectedPosition(position);
        onSelectedPositionChange(position, prevPosition);
    }

    public void setContentDescription(int i, String desc) {
        mContentDescriptions.put(i, desc);
    }

    private class TabClickListener implements OnClickListener {
        @Override
        public void onClick(View v) {
            for (int i = 0; i < mTabStrip.getChildCount(); i++) {
                if (v == mTabStrip.getChildAt(i)) {
                    if (onTap(i)) {
                        setSelectedPosition(i);
                    }
                    return;
                }
            }
        }
    }
}